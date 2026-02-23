const axios = require('axios');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const stageBucketURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com';

// Test URLs - same as v3.js for consistency
const admiral1 = 'https://automation-dotlapse-artefact.lambdatest.com/org-2503148/01K3R7RNKBS1WX4MVW7MZHA0RV/31254ffb-bebb-43b8-b120-90219d3e9a09/base-screenshots/Add_Tier_Van_on_Tier_Car___Final_Checks___Add_Van_Banner___Displays_chrome_Galaxy_S24_Plus_portrait.png'
const admiral2 = 'https://automation-dotlapse-artefact.lambdatest.com/org-2503148/01K3R7RNKBS1WX4MVW7MZHA0RV/8142e53e-dad1-47f0-8cbb-6fe68b205df0/base-screenshots/Add_Tier_Van_on_Tier_Car___Final_Checks___Add_Van_Banner___Displays_chrome_Galaxy_S24_Plus_portrait.png'

const firstScreenshotURL = admiral1;
const secondScreenshotURL = admiral2;

// ============================================================================
// URL PARSING & UTILITY FUNCTIONS (same as v3.js)
// ============================================================================

function parseSmartUiUrl(urlString) {
    const url = new URL(urlString);
    const origin = `${url.protocol}//${url.host}`;
    const parts = url.pathname.split('/').filter(Boolean);

    const orgId = parts[0] || null;
    const projectId = parts[1] || null;
    const buildId = parts[2] || null;
    const screenshotNameWithExt = parts[4] || null;

    let screenshotName = screenshotNameWithExt;
    if (screenshotName && screenshotName.toLowerCase().endsWith('.json')) {
        screenshotName = screenshotName.slice(0, -5);
    }

    return { origin, orgId, projectId, buildId, screenshotName };
}

async function getImageDimensions(url) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);

        if (buffer.length < 24) {
            throw new Error('Invalid PNG file - too short');
        }

        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);

        return { width, height };
    } catch (error) {
        console.error(`Failed to get image dimensions from URL: ${url}`, error.message);
        throw error;
    }
}

async function downloadImage(url, localPath) {
    try {
        const directory = path.dirname(localPath);
        fs.mkdirSync(directory, { recursive: true });

        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(localPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`Image downloaded successfully to ${localPath}`);
                resolve();
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Download failed:', error.message);
        throw error;
    }
}

async function downloadJSONFile(url) {
    try {
        const response = await axios.get(url, { responseType: 'json' });
        return response.data;
    } catch (error) {
        console.error(`Failed to download file from URL: ${url}`, error.message);
        throw new Error('Error downloading JSON file.');
    }
}

async function saveToFile(data, filename) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        await fsp.writeFile(`./debug/${filename}`, jsonString, 'utf8');
        console.log(` Successfully saved to ${filename}`);
        console.log(`   File size: ${jsonString.length} bytes`);
    } catch (error) {
        console.error(`Failed to save file: ${filename}`, error.message);
        throw error;
    }
}

// ============================================================================
// ELEMENT ID PARSING
// ============================================================================

const parseElementId = (elementId) => {
    if (!elementId) return null;

    const parts = elementId.split('/').filter(p => p);
    return {
        full: elementId,
        depth: parts.length,
        parts: parts,
        lastTag: parts[parts.length - 1]?.replace(/\[\d+\]/, ''),
        indices: parts.map(p => {
            const match = p.match(/\[(\d+)\]/);
            return match ? parseInt(match[1]) : null;
        }).filter(i => i !== null)
    };
};

// ============================================================================
// ELEMENT MATCHING (for finding corresponding elements between two pages)
// Uses the same matching algorithm as layout comparison
// ============================================================================

const calculatePathSimilarity = (path1, path2) => {
    if (path1.depth !== path2.depth) {
        const depthDiff = Math.abs(path1.depth - path2.depth);
        return Math.max(0, 1 - (depthDiff * 0.2));
    }

    let score = 0;
    const depth = path1.parts.length;

    for (let i = 0; i < depth; i++) {
        const part1 = path1.parts[i];
        const part2 = path2.parts[i];

        const tag1 = part1.replace(/\[\d+\]/, '');
        const tag2 = part2.replace(/\[\d+\]/, '');

        if (tag1 === tag2) {
            score += 0.6;

            const idx1 = part1.match(/\[(\d+)\]/)?.[1];
            const idx2 = part2.match(/\[(\d+)\]/)?.[1];

            if (idx1 === idx2) {
                score += 0.4;
            } else if (idx1 && idx2) {
                const diff = Math.abs(parseInt(idx1) - parseInt(idx2));
                score += Math.max(0, 0.4 - (diff * 0.1));
            }
        }
    }

    return score / depth;
};

const calculateClassSimilarity = (classes1, classes2) => {
    if (classes1.length === 0 && classes2.length === 0) return 1;
    if (classes1.length === 0 || classes2.length === 0) return 0;

    const set1 = new Set(classes1);
    const set2 = new Set(classes2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));

    return intersection.size / classes1.length;
};

const calculateLayoutStyleSimilarity = (styles1, styles2) => {
    // For matching purposes, only compare layout-related styles
    const layoutStyles = ['display', 'position', 'visibility', 'overflow'];
    let matches = 0;

    for (const style of layoutStyles) {
        if (styles1[style] === styles2[style]) {
            matches++;
        }
    }

    return matches / layoutStyles.length;
};

const calculateSizeSimilarity = (box1, box2) => {
    const heightRatio = Math.min(box1.height, box2.height) /
        Math.max(box1.height, box2.height);

    const widthRatio = Math.min(box1.width, box2.width) /
        Math.max(box1.width, box2.width);

    return (heightRatio * 0.7) + (widthRatio * 0.3);
};

function calculateIdSimilarity(srcNode, cmpNode) {
    if (!srcNode.id && !cmpNode.id) {
        return { score: 1.0, weight: 0, reason: 'no_ids_to_match' };
    }

    function isDynamicId(id) {
        if (!id) return false;
        const dynamicPatterns = [
            /[0-9a-f]{8,}/i,
            /\d{10,}/,
            /-(uuid|[0-9a-f]{6,})/i,
            /\d{4,}-\d{4,}/,
            /_\d{8,}/,
        ];
        return dynamicPatterns.some(pattern => pattern.test(id));
    }

    function getBaseId(id) {
        if (!id) return null;
        return id.replace(/[0-9a-f]{6,}/gi, 'DYNAMIC');
    }

    if (srcNode.id === cmpNode.id && srcNode.id !== null) {
        return { score: 1.0, weight: 0.15, reason: 'exact_match' };
    }

    const srcBase = getBaseId(srcNode.id);
    const cmpBase = getBaseId(cmpNode.id);

    if (srcBase === cmpBase && srcBase !== null && srcBase !== 'DYNAMIC') {
        return { score: 0.8, weight: 0.15, reason: 'base_match' };
    }

    const srcIsDynamic = isDynamicId(srcNode.id);
    const cmpIsDynamic = isDynamicId(cmpNode.id);

    if (srcIsDynamic || cmpIsDynamic) {
        return { score: 0.5, weight: 0.05, reason: 'dynamic_id_detected' };
    }

    if (srcNode.id && cmpNode.id) {
        const srcPrefix = srcNode.id.split(/[0-9a-f]{6,}/i)[0];
        const cmpPrefix = cmpNode.id.split(/[0-9a-f]{6,}/i)[0];

        if (srcPrefix && cmpPrefix && srcPrefix === cmpPrefix && srcPrefix.length > 5) {
            return { score: 0.7, weight: 0.08, reason: 'prefix_match' };
        }
    }

    return { score: 0.0, weight: 0.1, reason: 'no_match' };
}

/**
 * Calculate matching similarity between two nodes
 * This is used to MATCH elements between two pages (not to compare their content)
 */
const calculateMatchingSimilarity = (srcNode, cmpNode, srcPath, cmpPath) => {
    const breakdown = {};
    let totalScore = 0;
    let totalWeight = 0;

    // Path similarity (30% weight)
    if (srcNode.elementId === cmpNode.elementId) {
        breakdown.path = 1.0;
        breakdown.exactPath = true;
    } else {
        breakdown.path = calculatePathSimilarity(srcPath, cmpPath);
        breakdown.exactPath = false;
    }
    totalScore += breakdown.path * 0.3;
    totalWeight += 0.3;

    // Class/Style similarity (25% weight)
    const srcClasses = srcNode.classes || [];
    const cmpClasses = cmpNode.classes || [];

    let classScore = null;
    let styleScore = null;

    if (srcClasses.length > 0 || cmpClasses.length > 0) {
        classScore = calculateClassSimilarity(srcClasses, cmpClasses);
    }

    if (srcNode.styles?.relevant && cmpNode.styles?.relevant) {
        styleScore = calculateLayoutStyleSimilarity(
            srcNode.styles.relevant,
            cmpNode.styles.relevant
        );
    }

    if (classScore !== null && styleScore !== null) {
        breakdown.bestCriteria = Math.max(classScore, styleScore);
        totalScore += breakdown.bestCriteria * 0.25;
        totalWeight += 0.25;
    } else if (classScore !== null) {
        breakdown.bestCriteria = classScore;
        totalScore += breakdown.bestCriteria * 0.25;
        totalWeight += 0.25;
    } else if (styleScore !== null) {
        breakdown.bestCriteria = styleScore;
        totalScore += breakdown.bestCriteria * 0.25;
        totalWeight += 0.25;
    }

    // ID similarity (15% weight if both have IDs)
    if (srcNode.id || cmpNode.id) {
        const idResult = calculateIdSimilarity(srcNode, cmpNode);
        breakdown.id = idResult.score;
        totalScore += idResult.score * idResult.weight;
        totalWeight += idResult.weight;
    }

    // Size similarity (15% weight)
    if (srcNode.box && cmpNode.box) {
        breakdown.size = calculateSizeSimilarity(srcNode.box, cmpNode.box);
        totalScore += breakdown.size * 0.15;
        totalWeight += 0.15;
    }

    // Style similarity (10% weight)
    if (srcNode.styles?.relevant && cmpNode.styles?.relevant) {
        breakdown.styles = calculateLayoutStyleSimilarity(
            srcNode.styles.relevant,
            cmpNode.styles.relevant
        );
        totalScore += breakdown.styles * 0.1;
        totalWeight += 0.1;
    }

    // Tag match (5% weight)
    breakdown.tag = (srcNode.tagName === cmpNode.tagName) ? 1.0 : 0.0;
    totalScore += breakdown.tag * 0.05;
    totalWeight += 0.05;

    breakdown.total = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
        total: breakdown.total,
        breakdown
    };
};

/**
 * Match elements between source and compare nodes
 * Returns matched pairs and extra elements
 */
const matchElements = (sourceNodes, compareNodes, options = {}) => {
    const { minSimilarity = 0.85 } = options;

    const results = {
        matches: [],
        extraInSource: [],
        extraInCompare: [],
        matchedPairs: new Map()
    };

    const matchedCompareIndices = new Set();
    const matchedSourceIndices = new Set();
    const similarityMatrix = [];

    // Calculate similarity matrix
    sourceNodes.forEach((srcNode, srcIndex) => {
        const srcPath = parseElementId(srcNode.elementId);
        if (!srcPath) {
            results.extraInSource.push({
                node: srcNode,
                reason: 'invalid_path',
                index: srcIndex
            });
            return;
        }

        const similarities = [];

        compareNodes.forEach((cmpNode, cmpIndex) => {
            const cmpPath = parseElementId(cmpNode.elementId);
            if (!cmpPath) {
                similarities.push({ score: -1, cmpIndex });
                return;
            }

            const similarity = calculateMatchingSimilarity(srcNode, cmpNode, srcPath, cmpPath);

            similarities.push({
                score: similarity.total,
                cmpIndex,
                srcNode,
                cmpNode
            });
        });

        similarityMatrix.push({
            srcIndex,
            srcNode,
            similarities: similarities.sort((a, b) => b.score - a.score)
        });
    });

    // Sort by best match score
    similarityMatrix.sort((a, b) => {
        const bestA = a.similarities[0]?.score || -1;
        const bestB = b.similarities[0]?.score || -1;
        return bestB - bestA;
    });

    // Match elements
    similarityMatrix.forEach(srcEntry => {
        if (matchedSourceIndices.has(srcEntry.srcIndex)) return;

        const bestMatch = srcEntry.similarities.find(sim =>
            sim.score >= minSimilarity &&
            !matchedCompareIndices.has(sim.cmpIndex)
        );

        if (bestMatch) {
            matchedSourceIndices.add(srcEntry.srcIndex);
            matchedCompareIndices.add(bestMatch.cmpIndex);

            results.matches.push({
                sourceNode: bestMatch.srcNode,
                compareNode: bestMatch.cmpNode,
                similarity: bestMatch.score,
                sourceIndex: srcEntry.srcIndex,
                compareIndex: bestMatch.cmpIndex
            });

            results.matchedPairs.set(
                bestMatch.srcNode.elementId,
                bestMatch.cmpNode.elementId
            );
        } else {
            results.extraInSource.push({
                node: srcEntry.srcNode,
                reason: 'below_threshold',
                bestScore: srcEntry.similarities[0]?.score || 0,
                index: srcEntry.srcIndex
            });
        }
    });

    // Find unmatched compare elements
    compareNodes.forEach((cmpNode, cmpIndex) => {
        if (!matchedCompareIndices.has(cmpIndex)) {
            results.extraInCompare.push({
                node: cmpNode,
                reason: 'no_match_from_source',
                index: cmpIndex
            });
        }
    });

    return results;
};

// ============================================================================
// DOM COMPARISON - Compare ALL visual properties between matched elements
// ============================================================================

/**
 * Compare text content between two elements
 */
const compareTextContent = (srcNode, cmpNode) => {
    const srcText = (srcNode.textContent || '').trim();
    const cmpText = (cmpNode.textContent || '').trim();

    if (srcText === cmpText) {
        return null; // No difference
    }

    return {
        type: 'textContent',
        source: srcText,
        compare: cmpText,
        description: 'Text content differs'
    };
};

/**
 * Normalize style values for comparison
 * Handles minor variations in computed values
 */
const normalizeStyleValue = (value) => {
    if (value === null || value === undefined) return null;

    // Remove trailing decimals that might differ slightly (e.g., 18.4px vs 18.39px)
    // Convert "18.4px" to "18px" for comparison if difference is < 1
    const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
    if (pxMatch) {
        const num = parseFloat(pxMatch[1]);
        return `${Math.round(num)}px`;
    }

    return value;
};

/**
 * Compare all CSS styles between two elements
 */
const compareStyles = (srcNode, cmpNode, options = {}) => {
    const {
        ignoreProperties = [],  // Properties to ignore
        normalizeValues = true  // Normalize pixel values
    } = options;

    const srcStyles = srcNode.styles?.relevant || {};
    const cmpStyles = cmpNode.styles?.relevant || {};

    const differences = [];

    // Properties to always ignore (computed values that may vary)
    const defaultIgnore = [
        'width', 'height', 'top', 'right', 'bottom', 'left',  // Position/size in styles (we have box comparison)
        'min-height'  // Often includes browser-specific values
    ];

    const propsToIgnore = new Set([...defaultIgnore, ...ignoreProperties]);

    // Get all style keys from both
    const allKeys = new Set([...Object.keys(srcStyles), ...Object.keys(cmpStyles)]);

    for (const key of allKeys) {
        if (propsToIgnore.has(key)) continue;

        let srcValue = srcStyles[key];
        let cmpValue = cmpStyles[key];

        // Normalize values if enabled
        if (normalizeValues) {
            srcValue = normalizeStyleValue(srcValue);
            cmpValue = normalizeStyleValue(cmpValue);
        }

        if (srcValue !== cmpValue) {
            differences.push({
                property: key,
                source: srcStyles[key] || '(not set)',
                compare: cmpStyles[key] || '(not set)'
            });
        }
    }

    if (differences.length === 0) {
        return null;
    }

    return {
        type: 'styles',
        differences,
        description: `${differences.length} style(s) differ`
    };
};

/**
 * Compare visual styles (font, color, etc.) - subset of styles for quick check
 */
const compareVisualStyles = (srcNode, cmpNode) => {
    const srcStyles = srcNode.styles?.relevant || {};
    const cmpStyles = cmpNode.styles?.relevant || {};

    const visualProperties = [
        'color',
        'background-color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'text-align',
        'text-decoration',
        'border',
        'border-color',
        'opacity'
    ];

    const differences = [];

    for (const prop of visualProperties) {
        if (srcStyles[prop] !== cmpStyles[prop]) {
            differences.push({
                property: prop,
                source: srcStyles[prop] || '(not set)',
                compare: cmpStyles[prop] || '(not set)'
            });
        }
    }

    if (differences.length === 0) {
        return null;
    }

    return {
        type: 'visualStyles',
        differences,
        description: `${differences.length} visual style(s) differ`
    };
};

/**
 * Compare layout styles (position, size, etc.)
 */
const compareLayoutStyles = (srcNode, cmpNode) => {
    const srcStyles = srcNode.styles?.relevant || {};
    const cmpStyles = cmpNode.styles?.relevant || {};

    const layoutProperties = [
        'display',
        'position',
        'width',
        'height',
        'top',
        'right',
        'bottom',
        'left',
        'overflow',
        'overflow-x',
        'overflow-y',
        'visibility',
        'z-index'
    ];

    const differences = [];

    for (const prop of layoutProperties) {
        if (srcStyles[prop] !== cmpStyles[prop]) {
            differences.push({
                property: prop,
                source: srcStyles[prop] || '(not set)',
                compare: cmpStyles[prop] || '(not set)'
            });
        }
    }

    if (differences.length === 0) {
        return null;
    }

    return {
        type: 'layoutStyles',
        differences,
        description: `${differences.length} layout style(s) differ`
    };
};

/**
 * Compare bounding box with tolerance
 */
const compareBox = (srcNode, cmpNode, options = {}) => {
    const {
        positionTolerance = 5,    // Ignore position differences <= 5px
        sizeTolerance = 3         // Ignore size differences <= 3px
    } = options;

    const srcBox = srcNode.box || {};
    const cmpBox = cmpNode.box || {};

    const differences = [];
    const positionProps = ['x', 'y'];
    const sizeProps = ['width', 'height'];

    // Check position with tolerance
    for (const prop of positionProps) {
        const diff = Math.abs((srcBox[prop] || 0) - (cmpBox[prop] || 0));
        if (diff > positionTolerance) {
            differences.push({
                property: prop,
                source: srcBox[prop],
                compare: cmpBox[prop],
                difference: diff
            });
        }
    }

    // Check size with tolerance
    for (const prop of sizeProps) {
        const diff = Math.abs((srcBox[prop] || 0) - (cmpBox[prop] || 0));
        if (diff > sizeTolerance) {
            differences.push({
                property: prop,
                source: srcBox[prop],
                compare: cmpBox[prop],
                difference: diff
            });
        }
    }

    if (differences.length === 0) {
        return null;
    }

    return {
        type: 'box',
        differences,
        description: `Bounding box differs (beyond tolerance)`
    };
};

/**
 * Compare visual attributes (lang, etc.)
 */
const compareVisualAttributes = (srcNode, cmpNode) => {
    const srcAttrs = srcNode.visualAttributes || {};
    const cmpAttrs = cmpNode.visualAttributes || {};

    const allKeys = new Set([...Object.keys(srcAttrs), ...Object.keys(cmpAttrs)]);
    const differences = [];

    for (const key of allKeys) {
        if (srcAttrs[key] !== cmpAttrs[key]) {
            differences.push({
                attribute: key,
                source: srcAttrs[key] || '(not set)',
                compare: cmpAttrs[key] || '(not set)'
            });
        }
    }

    if (differences.length === 0) {
        return null;
    }

    return {
        type: 'visualAttributes',
        differences,
        description: `${differences.length} visual attribute(s) differ`
    };
};

/**
 * Compare media content (for images, videos, etc.)
 */
const compareMediaContent = (srcNode, cmpNode) => {
    const srcMedia = srcNode.mediaContent;
    const cmpMedia = cmpNode.mediaContent;

    if (srcMedia === cmpMedia) {
        return null;
    }

    // Deep compare if both are objects
    if (srcMedia && cmpMedia && typeof srcMedia === 'object' && typeof cmpMedia === 'object') {
        const allKeys = new Set([...Object.keys(srcMedia), ...Object.keys(cmpMedia)]);
        const differences = [];

        for (const key of allKeys) {
            if (JSON.stringify(srcMedia[key]) !== JSON.stringify(cmpMedia[key])) {
                differences.push({
                    property: key,
                    source: srcMedia[key],
                    compare: cmpMedia[key]
                });
            }
        }

        if (differences.length === 0) {
            return null;
        }

        return {
            type: 'mediaContent',
            differences,
            description: `Media content differs`
        };
    }

    return {
        type: 'mediaContent',
        source: srcMedia,
        compare: cmpMedia,
        description: 'Media content differs'
    };
};

/**
 * Compare form state (for inputs, selects, etc.)
 */
const compareFormState = (srcNode, cmpNode) => {
    const srcForm = srcNode.formState;
    const cmpForm = cmpNode.formState;

    if (srcForm === cmpForm) {
        return null;
    }

    if (srcForm && cmpForm && typeof srcForm === 'object' && typeof cmpForm === 'object') {
        const allKeys = new Set([...Object.keys(srcForm), ...Object.keys(cmpForm)]);
        const differences = [];

        for (const key of allKeys) {
            if (JSON.stringify(srcForm[key]) !== JSON.stringify(cmpForm[key])) {
                differences.push({
                    property: key,
                    source: srcForm[key],
                    compare: cmpForm[key]
                });
            }
        }

        if (differences.length === 0) {
            return null;
        }

        return {
            type: 'formState',
            differences,
            description: `Form state differs`
        };
    }

    return {
        type: 'formState',
        source: srcForm,
        compare: cmpForm,
        description: 'Form state differs'
    };
};

/**
 * Compare classes between elements
 */
const compareClasses = (srcNode, cmpNode) => {
    const srcClasses = srcNode.classes || [];
    const cmpClasses = cmpNode.classes || [];

    const srcSet = new Set(srcClasses);
    const cmpSet = new Set(cmpClasses);

    const onlyInSource = srcClasses.filter(c => !cmpSet.has(c));
    const onlyInCompare = cmpClasses.filter(c => !srcSet.has(c));

    if (onlyInSource.length === 0 && onlyInCompare.length === 0) {
        return null;
    }

    return {
        type: 'classes',
        onlyInSource,
        onlyInCompare,
        description: `Classes differ: +${onlyInCompare.length}, -${onlyInSource.length}`
    };
};

/**
 * Compare ID attribute
 */
const compareId = (srcNode, cmpNode) => {
    if (srcNode.id === cmpNode.id) {
        return null;
    }

    return {
        type: 'id',
        source: srcNode.id,
        compare: cmpNode.id,
        description: 'Element ID differs'
    };
};

/**
 * Perform full DOM comparison between two matched elements
 * Returns all differences found
 */
const compareDOMElements = (srcNode, cmpNode, options = {}) => {
    const {
        compareText = true,
        compareAllStyles = true,
        compareVisual = true,
        compareLayout = true,
        compareBoundingBox = true,
        compareAttributes = true,
        compareMedia = true,
        compareForm = true,
        compareClassList = true,
        compareElementId = false,  // Usually don't compare ID as it may be dynamic
        // Tolerance settings
        positionTolerance = 5,     // Ignore position differences <= 5px
        sizeTolerance = 3          // Ignore size differences <= 3px
    } = options;

    const differences = [];

    // Text content
    if (compareText) {
        const textDiff = compareTextContent(srcNode, cmpNode);
        if (textDiff) differences.push(textDiff);
    }

    // All styles
    if (compareAllStyles) {
        const styleDiff = compareStyles(srcNode, cmpNode);
        if (styleDiff) differences.push(styleDiff);
    } else {
        // If not comparing all styles, compare specific categories
        if (compareVisual) {
            const visualDiff = compareVisualStyles(srcNode, cmpNode);
            if (visualDiff) differences.push(visualDiff);
        }

        if (compareLayout) {
            const layoutDiff = compareLayoutStyles(srcNode, cmpNode);
            if (layoutDiff) differences.push(layoutDiff);
        }
    }

    // Bounding box (with tolerance)
    if (compareBoundingBox) {
        const boxDiff = compareBox(srcNode, cmpNode, { positionTolerance, sizeTolerance });
        if (boxDiff) differences.push(boxDiff);
    }

    // Visual attributes
    if (compareAttributes) {
        const attrDiff = compareVisualAttributes(srcNode, cmpNode);
        if (attrDiff) differences.push(attrDiff);
    }

    // Media content
    if (compareMedia) {
        const mediaDiff = compareMediaContent(srcNode, cmpNode);
        if (mediaDiff) differences.push(mediaDiff);
    }

    // Form state
    if (compareForm) {
        const formDiff = compareFormState(srcNode, cmpNode);
        if (formDiff) differences.push(formDiff);
    }

    // Classes
    if (compareClassList) {
        const classDiff = compareClasses(srcNode, cmpNode);
        if (classDiff) differences.push(classDiff);
    }

    // Element ID
    if (compareElementId) {
        const idDiff = compareId(srcNode, cmpNode);
        if (idDiff) differences.push(idDiff);
    }

    return differences;
};

/**
 * Categorize differences by severity
 */
const categorizeDifference = (diff) => {
    // Critical: Text content, visual styles (what users see)
    if (diff.type === 'textContent') return 'critical';
    if (diff.type === 'visualStyles') return 'critical';
    if (diff.type === 'mediaContent') return 'critical';

    // High: Layout changes that affect visual appearance
    if (diff.type === 'layoutStyles') return 'high';
    if (diff.type === 'box') return 'high';

    // Medium: Styles that might affect appearance
    if (diff.type === 'styles') return 'medium';

    // Low: Metadata changes
    if (diff.type === 'classes') return 'low';
    if (diff.type === 'visualAttributes') return 'low';
    if (diff.type === 'formState') return 'low';
    if (diff.type === 'id') return 'low';

    return 'low';
};

/**
 * Detect global layout shift patterns
 * If many elements are shifted by a consistent amount, it's likely a global shift
 */
const detectGlobalShift = (matchResults) => {
    const yShifts = [];
    const xShifts = [];

    for (const match of matchResults) {
        if (match.sourceNode.box && match.compareNode.box) {
            const yDiff = match.compareNode.box.y - match.sourceNode.box.y;
            const xDiff = match.compareNode.box.x - match.sourceNode.box.x;
            yShifts.push(yDiff);
            xShifts.push(xDiff);
        }
    }

    // Find most common shifts
    const findMode = (arr) => {
        const frequency = {};
        let maxFreq = 0;
        let mode = 0;

        for (const val of arr) {
            const rounded = Math.round(val);  // Round to nearest pixel
            frequency[rounded] = (frequency[rounded] || 0) + 1;
            if (frequency[rounded] > maxFreq) {
                maxFreq = frequency[rounded];
                mode = rounded;
            }
        }

        return { mode, frequency: maxFreq, total: arr.length };
    };

    const yMode = findMode(yShifts);
    const xMode = findMode(xShifts);

    // If more than 30% of elements share the same shift, it's a global shift
    const threshold = 0.3;

    return {
        yShift: (yMode.frequency / yMode.total) > threshold ? yMode.mode : 0,
        xShift: (xMode.frequency / xMode.total) > threshold ? xMode.mode : 0,
        yShiftPercentage: Math.round((yMode.frequency / yMode.total) * 100),
        xShiftPercentage: Math.round((xMode.frequency / xMode.total) * 100)
    };
};

/**
 * Check if a box difference is just a global shift
 */
const isGlobalShiftOnly = (boxDiff, globalShift, tolerance = 5) => {
    if (!boxDiff || boxDiff.type !== 'box') return false;

    for (const diff of boxDiff.differences) {
        if (diff.property === 'y') {
            const expectedDiff = globalShift.yShift;
            if (Math.abs(diff.difference - Math.abs(expectedDiff)) > tolerance) {
                return false;  // Not just a global shift
            }
        } else if (diff.property === 'x') {
            const expectedDiff = globalShift.xShift;
            if (Math.abs(diff.difference - Math.abs(expectedDiff)) > tolerance) {
                return false;
            }
        } else {
            // Width/height difference - not a global shift
            return false;
        }
    }

    return true;
};

/**
 * Main DOM comparison function
 * Takes source and compare nodes, finds matches, and compares all properties
 */
const findDOMDifferences = (sourceNodes, compareNodes, options = {}) => {
    const {
        minSimilarity = 0.85,
        comparisonOptions = {},
        filterGlobalShifts = true  // Filter out global layout shifts
    } = options;

    // Step 1: Match elements between the two pages
    console.log('Matching elements...');
    const matchResult = matchElements(sourceNodes, compareNodes, { minSimilarity });

    // Step 1.5: Detect global shifts
    let globalShift = { yShift: 0, xShift: 0, yShiftPercentage: 0, xShiftPercentage: 0 };
    if (filterGlobalShifts) {
        globalShift = detectGlobalShift(matchResult.matches);
        if (globalShift.yShift !== 0 || globalShift.xShift !== 0) {
            console.log(`Detected global shift: Y=${globalShift.yShift}px (${globalShift.yShiftPercentage}% elements), X=${globalShift.xShift}px (${globalShift.xShiftPercentage}% elements)`);
        }
    }

    // Step 2: Compare matched elements
    console.log('Comparing matched elements...');
    const elementDifferences = [];

    for (const match of matchResult.matches) {
        const differences = compareDOMElements(
            match.sourceNode,
            match.compareNode,
            comparisonOptions
        );

        if (differences.length > 0) {
            // Filter out global shift differences if enabled
            let filteredDiffs = differences;
            if (filterGlobalShifts && (globalShift.yShift !== 0 || globalShift.xShift !== 0)) {
                filteredDiffs = differences.filter(diff => {
                    if (diff.type === 'box' && isGlobalShiftOnly(diff, globalShift)) {
                        return false;  // Skip this difference
                    }
                    return true;
                });
            }

            if (filteredDiffs.length === 0) continue;  // No significant differences

            // Categorize differences
            const categorizedDiffs = filteredDiffs.map(diff => ({
                ...diff,
                severity: categorizeDifference(diff)
            }));

            elementDifferences.push({
                sourceElement: match.sourceNode.elementId,
                compareElement: match.compareNode.elementId,
                matchSimilarity: match.similarity,
                sourceBox: match.sourceNode.box,
                compareBox: match.compareNode.box,
                differences: categorizedDiffs,
                hasCritical: categorizedDiffs.some(d => d.severity === 'critical'),
                hasHigh: categorizedDiffs.some(d => d.severity === 'high')
            });
        }
    }

    // Step 3: Compile results
    const results = {
        // Elements that matched and have differences
        modifiedElements: elementDifferences,

        // Elements only in source (not in compare)
        extraInSource: matchResult.extraInSource,

        // Elements only in compare (not in source)
        extraInCompare: matchResult.extraInCompare,

        // All matched pairs (including those with no differences)
        matchedCount: matchResult.matches.length,

        // Global shift info
        globalShift,

        // Summary
        summary: {
            totalSource: sourceNodes.length,
            totalCompare: compareNodes.length,
            matched: matchResult.matches.length,
            modified: elementDifferences.length,
            extraInSource: matchResult.extraInSource.length,
            extraInCompare: matchResult.extraInCompare.length,
            criticalDifferences: elementDifferences.filter(e => e.hasCritical).length,
            highDifferences: elementDifferences.filter(e => e.hasHigh).length,
            globalYShift: globalShift.yShift,
            globalXShift: globalShift.xShift
        }
    };

    return results;
};

// ============================================================================
// DATA FETCHING
// ============================================================================

async function getData(url, screenshotWidth = null, screenshotHeight = null) {
    const elementData = await downloadJSONFile(url);

    let filteredElementData = elementData;

    if (screenshotWidth !== null && screenshotHeight !== null) {
        filteredElementData = elementData.filter(item => {
            if (!item.box) return false;

            const left = typeof item.box.left === 'number' ? item.box.left : (typeof item.box.x === 'number' ? item.box.x : 0);
            const top = typeof item.box.top === 'number' ? item.box.top : (typeof item.box.y === 'number' ? item.box.y : 0);
            const width = typeof item.box.width === 'number' ? item.box.width : 0;
            const height = typeof item.box.height === 'number' ? item.box.height : 0;

            if (width <= 0 || height <= 0) return false;

            const overlapsHorizontally = (left + width) > 0 && left < screenshotWidth;
            const overlapsVertically = (top + height) > 0 && top < screenshotHeight;

            return overlapsHorizontally && overlapsVertically;
        });
    }

    const finalData = [];

    for (const [index, item] of filteredElementData.entries()) {
        if (item.hasOwnProperty('elementId')) {
            item.index = index;
            finalData.push(item.elementId);
        }
    }

    return {
        elementIds: finalData,
        fullData: filteredElementData
    };
}

// ============================================================================
// PAINT API INTEGRATION
// ============================================================================

const paintScreenshotComparison = async (mismatchedBoxes1, mismatchedBoxes2, domURL1, domURL2, elementDataURL1, elementDataURL2, firstScreenshotURL, secondScreenshotURL, paths, screenshotIds) => {
    try {
        const PAINT_API_URL = 'https://stage-smartui-screenshot-comparison.lambdatestinternal.com/smart-ignore-comparison';
        const requestBody = {
            paintScreenshot: true,
            mismatchedBoxes1,
            mismatchedBoxes2,
            domURL1,
            domURL2,
            elementDataURL1,
            elementDataURL2,
            firstScreenshotURL,
            secondScreenshotURL,
            paths,
            screenshotIds
        };

        console.log('Making paintScreenshotComparison API call...');
        const response = await axios.post(PAINT_API_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (err) {
        console.log('Error from paintScreenshotComparison due to:', err);
        throw err;
    }
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    try {
        const baseParsed = parseSmartUiUrl(firstScreenshotURL);
        const compParsed = parseSmartUiUrl(secondScreenshotURL);

        const baseOrigin = baseParsed.origin;
        const orgId = baseParsed.orgId;
        const projectId = baseParsed.projectId;
        const baseBuildId = baseParsed.buildId;
        const compBuildId = compParsed.buildId;
        const screenshotName = baseParsed.screenshotName.replace(/\.png$/, '');

        const baseElementData = `${baseOrigin}/${orgId}/${projectId}/${baseBuildId}/elementsData/${screenshotName}.json`;
        const compElementData = `${baseOrigin}/${orgId}/${projectId}/${compBuildId}/elementsData/${screenshotName}.json`;

        console.log({
            screenshotName,
            baseElementData,
            compElementData
        });

        // Get screenshot dimensions to filter elements
        console.log('\n Getting screenshot dimensions...');
        const baseDimensions = await getImageDimensions(firstScreenshotURL);
        const compDimensions = await getImageDimensions(secondScreenshotURL);

        console.log(`Base screenshot: ${baseDimensions.width}x${baseDimensions.height}`);
        console.log(`Comp screenshot: ${compDimensions.width}x${compDimensions.height}`);

        // Download element data
        const nodeData1 = await getData(baseElementData, baseDimensions.width, baseDimensions.height);
        const nodeData2 = await getData(compElementData, compDimensions.width, compDimensions.height);

        console.log(`Base elements: ${nodeData1.fullData.length}`);
        console.log(`Comp elements: ${nodeData2.fullData.length}`);

        // Save element data for debugging
        await saveToFile(nodeData1.fullData, 'domBase.json');
        await saveToFile(nodeData2.fullData, 'domComp.json');

        // Run DOM comparison with sensible defaults
        console.log('\n Running DOM comparison...');
        const domDiffs = findDOMDifferences(nodeData1.fullData, nodeData2.fullData, {
            minSimilarity: 0.85,
            comparisonOptions: {
                // What to compare
                compareText: true,
                compareAllStyles: true,
                compareBoundingBox: true,
                compareAttributes: true,
                compareMedia: true,
                compareForm: true,
                compareClassList: false,  // Classes often change dynamically, disable by default
                compareElementId: false,
                // Tolerance settings
                positionTolerance: 5,     // Ignore position shifts <= 5px
                sizeTolerance: 3          // Ignore size changes <= 3px
            }
        });

        // Save DOM comparison report
        await saveToFile(domDiffs, 'domReport.json');

        console.log('\n=== DOM Comparison Summary ===');
        console.log(`Total source elements: ${domDiffs.summary.totalSource}`);
        console.log(`Total compare elements: ${domDiffs.summary.totalCompare}`);
        console.log(`Matched elements: ${domDiffs.summary.matched}`);
        console.log(`Modified elements (with differences): ${domDiffs.summary.modified}`);
        console.log(`Extra in source: ${domDiffs.summary.extraInSource}`);
        console.log(`Extra in compare: ${domDiffs.summary.extraInCompare}`);
        console.log(`Critical differences: ${domDiffs.summary.criticalDifferences}`);
        console.log(`High differences: ${domDiffs.summary.highDifferences}`);

        // Print critical differences summary
        const criticalElements = domDiffs.modifiedElements.filter(e => e.hasCritical);
        if (criticalElements.length > 0) {
            console.log('\n=== Critical Differences (Content Changes) ===');
            for (const elem of criticalElements) {
                const textDiffs = elem.differences.filter(d => d.type === 'textContent');
                for (const diff of textDiffs) {
                    console.log(`  "${diff.source}" -> "${diff.compare}"`);
                }
            }
        }

        // Print extra elements summary
        if (domDiffs.extraInSource.length > 0) {
            console.log('\n=== Elements only in Source ===');
            for (const extra of domDiffs.extraInSource.slice(0, 10)) {
                console.log(`  ${extra.node.elementId} (${extra.node.tagName})`);
            }
            if (domDiffs.extraInSource.length > 10) {
                console.log(`  ... and ${domDiffs.extraInSource.length - 10} more`);
            }
        }

        if (domDiffs.extraInCompare.length > 0) {
            console.log('\n=== Elements only in Compare ===');
            for (const extra of domDiffs.extraInCompare.slice(0, 10)) {
                console.log(`  ${extra.node.elementId} (${extra.node.tagName})`);
            }
            if (domDiffs.extraInCompare.length > 10) {
                console.log(`  ... and ${domDiffs.extraInCompare.length - 10} more`);
            }
        }

        // Create mismatch boxes for painting
        // For DOM comparison: ONLY highlight critical content differences + extra elements
        // Do NOT highlight position-only changes (those are layout comparison territory)

        // Filter elements with MEANINGFUL content differences only
        // Focus on: text changes, media changes (not general style noise)
        const elementsWithContentDiffs = domDiffs.modifiedElements.filter(e => {
            const hasTextDiff = e.differences.some(d => d.type === 'textContent');
            const hasMediaDiff = e.differences.some(d => d.type === 'mediaContent');
            return hasTextDiff || hasMediaDiff;
        });

        console.log(`\nElements with actual content differences: ${elementsWithContentDiffs.length}`);

        const mismatchedBoxes1 = [
            // Only elements with content differences (not position-only)
            ...elementsWithContentDiffs.map(e => ({
                top: e.sourceBox.y,
                left: e.sourceBox.x,
                width: e.sourceBox.width,
                height: e.sourceBox.height,
                type: 'content_diff'
            })),
            // Extra in source
            ...domDiffs.extraInSource.map(e => ({
                top: e.node.box.y,
                left: e.node.box.x,
                width: e.node.box.width,
                height: e.node.box.height,
                type: 'extra'
            }))
        ];

        const mismatchedBoxes2 = [
            // Only elements with content differences (not position-only)
            ...elementsWithContentDiffs.map(e => ({
                top: e.compareBox.y,
                left: e.compareBox.x,
                width: e.compareBox.width,
                height: e.compareBox.height,
                type: 'content_diff'
            })),
            // Extra in compare
            ...domDiffs.extraInCompare.map(e => ({
                top: e.node.box.y,
                left: e.node.box.x,
                width: e.node.box.width,
                height: e.node.box.height,
                type: 'extra'
            }))
        ];

        await saveToFile({ mismatchedBoxes1, mismatchedBoxes2 }, 'domMismatchedBoxes.json');

        console.log('\nParsed URL pieces:', {
            baseOrigin, orgId, projectId, baseBuildId, compBuildId, screenshotName
        });

        const firstScreenshotPath = `dom_${screenshotName}_base.png`;
        const secondScreenshotPath = `dom_${screenshotName}_comp.png`;

        // Paint the comparison
        const res = await paintScreenshotComparison(
            mismatchedBoxes1,
            mismatchedBoxes2,
            'domURL1',
            'domURL2',
            baseElementData,
            compElementData,
            firstScreenshotURL,
            secondScreenshotURL,
            [firstScreenshotPath, secondScreenshotPath],
            ["", ""]
        );

        console.log(`\nbaseDiff: ${res.screenshots[0].misMatchPercentage}%, compDiff: ${res.screenshots[1].misMatchPercentage}%`);

        const baseDiffURL = `${stageBucketURL}/${firstScreenshotPath}`;
        const compDiffURL = `${stageBucketURL}/${secondScreenshotPath}`;

        const basePath = `./screenshots/output/dom/base/${screenshotName}.png`;
        const compPath = `./screenshots/output/dom/comp/${screenshotName}.png`;

        await downloadImage(baseDiffURL, basePath);
        await downloadImage(compDiffURL, compPath);

        console.log('\n DOM comparison complete!');

    } catch (error) {
        console.error('Failed to complete operation:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}

// Export functions for use in other modules
module.exports = {
    findDOMDifferences,
    compareDOMElements,
    matchElements,
    downloadJSONFile,
    saveToFile,
    getData
};
