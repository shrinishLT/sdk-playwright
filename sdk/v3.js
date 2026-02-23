const axios = require('axios');
const { sign } = require('crypto');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const stageBucketURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com';


const viatorBaseURL = 'https://automation-dotlapse-artefact.lambdatest.com/org-833575/188cc85d-b952-4cd1-ae3d-66cb82d35104/9936554d-0bb2-4330-8251-181d952426e6/base-screenshots/THINGS_TO_DO_canary_chrome_1366x0.png';
const viatorCompURL = 'https://automation-dotlapse-artefact.lambdatest.com/org-833575/188cc85d-b952-4cd1-ae3d-66cb82d35104/942479ad-631d-4dcf-8ec2-d9f8f94a250d/base-screenshots/THINGS_TO_DO_canary_chrome_1366x0.png';

const autodeskBaseURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K451TWDX6DN17JHT7626774Y/4c317a07-72ed-459f-b7f5-0574e1a00e3b/base-screenshots/autodesk_chrome_1920x0.png';
const autodeskCompURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K451TWDX6DN17JHT7626774Y/72012712-1ead-4081-9ba1-f50a38a94a24/base-screenshots/autodesk_chrome_1920x0.png';

const whatsappBaseURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K451TWDX6DN17JHT7626774Y/4c317a07-72ed-459f-b7f5-0574e1a00e3b/base-screenshots/whatsapp_chrome_1920x0.png';
const whatsappCompURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K451TWDX6DN17JHT7626774Y/72012712-1ead-4081-9ba1-f50a38a94a24/base-screenshots/whatsapp_chrome_1920x0.png';

const atlassianBaseURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K451TWDX6DN17JHT7626774Y/4c317a07-72ed-459f-b7f5-0574e1a00e3b/base-screenshots/atlassian_chrome_1920x0.png';
const atlassianCompURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K451TWDX6DN17JHT7626774Y/72012712-1ead-4081-9ba1-f50a38a94a24/base-screenshots/atlassian_chrome_1920x0.png';

const flipkartBaseURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K44Y3FN58Q9WYHFY85Y6ADJB/683aabb5-b088-4a96-b7c2-70ded02ac460/base-screenshots/Screenshot1_chrome_1920x0.png';
const flipkartCompURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-116499/01K44Y3FN58Q9WYHFY85Y6ADJB/87d5ec97-32c4-450c-9d33-2b73c2510232/base-screenshots/Screenshot1_chrome_1920x0.png';

const kayakbase1 = 'https://automation-dotlapse-artefact.lambdatest.com/org-1136539/00d78f18-5fd5-4eba-9cb9-0d873330016a/9a91d998-fbd6-45db-8f96-8cb067795e07/base-screenshots/_kayak___en_us__Cars_Results_Page_chrome_1280x0.png'
const kayakcomp1 = 'https://automation-dotlapse-artefact.lambdatest.com/org-1136539/00d78f18-5fd5-4eba-9cb9-0d873330016a/f8847497-db41-4cfb-abc3-097c8fc4704f/base-screenshots/_kayak___en_us__Cars_Results_Page_chrome_1280x0.png'

const kayakbase4 = 'https://automation-dotlapse-artefact.lambdatest.com/org-1136539/00d78f18-5fd5-4eba-9cb9-0d873330016a/9a91d998-fbd6-45db-8f96-8cb067795e07/base-screenshots/_kayak___en_us__Packages_Results_Page_chrome_1280x0.png'
const kayakcomp4 = 'https://automation-dotlapse-artefact.lambdatest.com/org-1136539/00d78f18-5fd5-4eba-9cb9-0d873330016a/f8847497-db41-4cfb-abc3-097c8fc4704f/base-screenshots/_kayak___en_us__Packages_Results_Page_chrome_1280x0.png'

const ltqa2BaseURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33244476/01JS4AKKT4P585YAAHQF0J6R3C/e5fc2cf0-9ea4-4c05-b2d3-8d2e2d3b7b89/base-screenshots/ltqa_2_chrome_1920x0.png'
const ltqa2compURL = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33244476/01JS4AKKT4P585YAAHQF0J6R3C/2a9e9cbe-bbd7-41c4-8b77-5e91f4231417/base-screenshots/ltqa_2_chrome_1920x0.png'

const ltqa3base = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33244476/01JS4AKKT4P585YAAHQF0J6R3C/e5fc2cf0-9ea4-4c05-b2d3-8d2e2d3b7b89/base-screenshots/ltqa_3_chrome_1920x0.png'
const ltqa3comp = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33244476/01JS4AKKT4P585YAAHQF0J6R3C/2a9e9cbe-bbd7-41c4-8b77-5e91f4231417/base-screenshots/ltqa_3_chrome_1920x0.png'

const kayakfix1 = 'https://automation-dotlapse-artefact.lambdatest.com/org-1136539/00d78f18-5fd5-4eba-9cb9-0d873330016a/9a91d998-fbd6-45db-8f96-8cb067795e07/base-screenshots/_kayak___en_us__Cars_Results_Page_chrome_1920x0.png'
const kayakfix2 = 'https://automation-dotlapse-artefact.lambdatest.com/org-1136539/00d78f18-5fd5-4eba-9cb9-0d873330016a/773e9388-d9d2-4b35-a505-6995160c0c97/base-screenshots/_kayak___en_us__Cars_Results_Page_chrome_1920x0.png'

const sizediff1 = 'https://automation-dotlapse-artefact.lambdatest.com/org-2454120/01K63AE3VQS3F10BGKNWX5WF6F/7a1aa182-8c3d-4c65-935f-8db48ff9812e/base-screenshots/SignIn_Page_chrome_1440x3664.png'
const sizediff2 = 'https://automation-dotlapse-artefact.lambdatest.com/org-2454120/01K63AE3VQS3F10BGKNWX5WF6F/c1571f44-d336-44a7-a41e-9510f590395b/base-screenshots/SignIn_Page_chrome_1440x3664.png'

const conde1base = 'https://automation-dotlapse-artefact.lambdatest.com/org-998272/01K9477DZR37HB1QHTQWK1BB1W/0c34053c-8343-4d11-a087-64afe1b1099b/base-screenshots/epicurious_home_page_chrome_1920x0.png'
const condebcomp1 = 'https://automation-dotlapse-artefact.lambdatest.com/org-998272/01K9477DZR37HB1QHTQWK1BB1W/e5286e22-0d49-4594-93a2-ade58928de92/base-screenshots/epicurious_home_page_chrome_1920x0.png'

const netflixstage1 = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33312881/01JT5TWXB7G5GQSR0619CZMGAV/e86ea037-16d0-42cb-b918-d413d5fcae53/base-screenshots/netflix_safari_iPhone_14_portrait.png'
const netflixstage2 = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33312881/01JT5TWXB7G5GQSR0619CZMGAV/05853ec9-5446-4b15-8486-77478aa8c8a0/base-screenshots/netflix_safari_iPhone_14_portrait.png'

const atlassianstage1 = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33312881/01JT5TWXB7G5GQSR0619CZMGAV/e86ea037-16d0-42cb-b918-d413d5fcae53/base-screenshots/atlassian_chrome_1920x0.png';
const atlasianstage2 = 'https://stage-automation-dotlapse-artefact.lambdatestinternal.com/org-33312881/01JT5TWXB7G5GQSR0619CZMGAV/05853ec9-5446-4b15-8486-77478aa8c8a0/base-screenshots/atlassian_chrome_1920x0.png';

const admiral1= 'https://automation-dotlapse-artefact.lambdatest.com/org-2503148/01K3R7RNKBS1WX4MVW7MZHA0RV/31254ffb-bebb-43b8-b120-90219d3e9a09/base-screenshots/Add_Tier_Van_on_Tier_Car___Final_Checks___Add_Van_Banner___Displays_chrome_Galaxy_S24_Plus_portrait.png'
const admiral2 = 'https://automation-dotlapse-artefact.lambdatest.com/org-2503148/01K3R7RNKBS1WX4MVW7MZHA0RV/8142e53e-dad1-47f0-8cbb-6fe68b205df0/base-screenshots/Add_Tier_Van_on_Tier_Car___Final_Checks___Add_Van_Banner___Displays_chrome_Galaxy_S24_Plus_portrait.png'

const firstScreenshotURL = admiral1;
const secondScreenshotURL = admiral2;   

function parseSmartUiUrl(urlString) {
    const url = new URL(urlString);
    const origin = `${url.protocol}//${url.host}`; // domain until .com with scheme

    // Expected path format:
    // /org-<orgId>/<projectId>/<buildId>/elementsData/<screenshotName>.json
    const parts = url.pathname.split('/').filter(Boolean);

    const orgId = parts[0] || null;
    const projectId = parts[1] || null;
    const buildId = parts[2] || null;
    const screenshotNameWithExt = parts[4] || null; // after 'elementsData'

    let screenshotName = screenshotNameWithExt;
    if (screenshotName && screenshotName.toLowerCase().endsWith('.json')) {
        screenshotName = screenshotName.slice(0, -5);
    }

    return { origin, orgId, projectId, buildId, screenshotName };
}

/**
 * Get PNG image dimensions from URL
 * Reads the PNG IHDR chunk to extract width and height
 */
async function getImageDimensions(url) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);
        
        // PNG signature is at bytes 0-7, IHDR starts at byte 16
        // Width is at bytes 16-19 (4 bytes, big-endian)
        // Height is at bytes 20-23 (4 bytes, big-endian)
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

        // console.log('paintScreenshotComparison response:', response.data);
        return response.data;
    } catch (err) {
        console.log('Error from paintScreenshotComparison due to:', err);
        throw err;
    }
}

const findLayoutDifferences = (sourceNodes, compareNodes, options = {}) => {
    const {
        minSimilarity = 0.85,  // Minimum similarity threshold for matching
        debug = false  // Enable debug logging
    } = options;

    const results = {
        matches: [],
        extraInSource: [],
        extraInCompare: [],
        matchedPairs: new Map(),
        debugInfo: []
    }

    // Track which nodes have been matched
    const matchedCompareIndices = new Set();
    const matchedSourceIndices = new Set();

    // Create a similarity matrix for all source-compare pairs
    const similarityMatrix = [];

    // Calculate similarity for every source-compare pair
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

            // Calculate comprehensive similarity score
            const similarity = calculateComprehensiveSimilarity(srcNode, cmpNode, srcPath, cmpPath);

            similarities.push({
                score: similarity.total,
                cmpIndex,
                // breakdown: similarity.breakdown,
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

    // Find best matches using Hungarian algorithm approach
    // Sort by best available match score to prioritize high-confidence matches
    similarityMatrix.sort((a, b) => {
        const bestA = a.similarities[0]?.score || -1;
        const bestB = b.similarities[0]?.score || -1;
        return bestB - bestA;
    });

    // Match elements based on best similarity scores
    similarityMatrix.forEach(srcEntry => {
        // console.log('index', srcEntry.srcIndex, 'bestMatch similarity', srcEntry.similarities[0]?.score, 'with cmp Node', srcEntry.similarities[0]?.cmpNode?.elementId);
        if (matchedSourceIndices.has(srcEntry.srcIndex)) return;

        // Find best unmatched compare element
        const bestMatch = srcEntry.similarities.find(sim =>
            sim.score >= minSimilarity &&
            !matchedCompareIndices.has(sim.cmpIndex)
        );

        if (bestMatch) {
            // Record the match
            matchedSourceIndices.add(srcEntry.srcIndex);
            matchedCompareIndices.add(bestMatch.cmpIndex);

            const matchType = determineMatchType(
                bestMatch.srcNode,
                bestMatch.cmpNode,
                bestMatch.score
            );

            results.matches.push({
                sourceElement: bestMatch.srcNode.elementId,
                compareElement: bestMatch.cmpNode.elementId,
                similarity: bestMatch.score,
                matchType,
                // breakdown: bestMatch.breakdown,
                // srcIndex: srcEntry.srcIndex,
                // cmpIndex: bestMatch.cmpIndex
            });

            results.matchedPairs.set(
                bestMatch.srcNode.elementId,
                bestMatch.cmpNode.elementId
            );

            if (debug) {
                results.debugInfo.push({
                    // source: bestMatch.srcNode.elementId,
                    // matched: bestMatch.cmpNode.elementId,
                    similarity: bestMatch.score,
                    // breakdown: bestMatch.breakdown,
                    // otherCandidates: srcEntry.similarities.slice(0, 3).map(s => ({
                    //     element: s.cmpNode?.elementId,
                    //     score: s.score
                    // }))
                });
            }
        } else {
            // No match found above threshold
            results.extraInSource.push({
                node: srcEntry.srcNode,
                reason: 'below_threshold',
                bestScore: srcEntry.similarities[0]?.score || 0,
                bestScoreIndex: srcEntry.similarities[0]?.cmpIndex || 0,
                // minRequired: minSimilarity,
                // index: srcEntry.srcIndex
            });

            if (debug && srcEntry.similarities[0]?.score > 0) {
                results.debugInfo.push({
                    source: srcEntry.srcNode.elementId,
                    matched: null,
                    bestCandidate: srcEntry.similarities[0].cmpNode?.elementId,
                    bestScore: srcEntry.similarities[0].score,
                    breakdown: srcEntry.similarities[0].breakdown,
                    // reason: 'below_threshold'
                });
            }
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

    // Calculate summary statistics
    results.summary = {
        totalSource: sourceNodes.length,
        totalCompare: compareNodes.length,
        matched: results.matches.length,
        extraInSource: results.extraInSource.length,
        extraInCompare: results.extraInCompare.length,
    };

    return results;
};

/**
 * Calculate comprehensive similarity between two nodes
 */
const calculateComprehensiveSimilarity = (srcNode, cmpNode, srcPath, cmpPath) => {
    const breakdown = {};
    let totalScore = 0;
    let totalWeight = 0;

    // 1. Path similarity (30% weight)
    // Exact path match gets bonus, but not automatic match
    if (srcNode.elementId === cmpNode.elementId) {
        // return {
        //     total : 1.0,
        //     breakdown : {}
        // }; 
        breakdown.path = 1.0;
        breakdown.exactPath = true;
    } else {
        breakdown.path = calculatePathSimilarity(srcPath, cmpPath);
        breakdown.exactPath = false;
    }
    totalScore += breakdown.path * 0.3;
    totalWeight += 0.3;

    // 2. Class similarity (10% weight)
    const srcClasses = srcNode.classes || [];
    const cmpClasses = cmpNode.classes || [];
    
    let classScore = null;
    let styleScore = null;
    
    // Calculate class similarity if available
    if (srcClasses.length > 0 || cmpClasses.length > 0) {
        classScore = calculateClassSimilarity(srcClasses, cmpClasses);
    }
    
    // Calculate style similarity if available
    if (srcNode.styles?.relevant && cmpNode.styles?.relevant) {
        styleScore = calculateStyleSimilarity(
            srcNode.styles.relevant,
            cmpNode.styles.relevant
        );
    }
    
    // Use the better score between classes and styles
    if (classScore !== null && styleScore !== null) {
        if (classScore >= styleScore) {
            breakdown.bestCriteria = classScore;
            breakdown.bestCriteriaType = 'classes';
            breakdown.classes = classScore;
            breakdown.styles = styleScore; // Store both for reference
        } else {
            breakdown.bestCriteria = styleScore;
            breakdown.bestCriteriaType = 'styles';
            breakdown.styles = styleScore;
            breakdown.classes = classScore; // Store both for reference
        }
        totalScore += breakdown.bestCriteria * 0.25;
        totalWeight += 0.25;
    } else if (classScore !== null) {
        breakdown.bestCriteria = classScore;
        breakdown.bestCriteriaType = 'classes';
        breakdown.classes = classScore;
        totalScore += breakdown.bestCriteria * 0.25;
        totalWeight += 0.25;
    } else if (styleScore !== null) {
        breakdown.bestCriteria = styleScore;
        breakdown.bestCriteriaType = 'styles';
        breakdown.styles = styleScore;
        totalScore += breakdown.bestCriteria * 0.25;
        totalWeight += 0.25;
    }

    // 3. ID similarity (15% weight if both have IDs)
    if (srcNode.id || cmpNode.id) {
        const idResult = calculateIdSimilarity(srcNode, cmpNode);
        breakdown.id = idResult.score;
        breakdown.idReason = idResult.reason; // For debugging
        totalScore += idResult.score * idResult.weight;
        totalWeight += idResult.weight;
    }

    // 4. Size similarity (15% weight)
    if (srcNode.box && cmpNode.box) {
        breakdown.size = calculateSizeSimilarity(srcNode.box, cmpNode.box);
        totalScore += breakdown.size * 0.15;
        totalWeight += 0.15;
    }

    // 5. Style similarity (10% weight)
    if (srcNode.styles?.relevant && cmpNode.styles?.relevant) {
        breakdown.styles = calculateStyleSimilarity(
            srcNode.styles.relevant,
            cmpNode.styles.relevant
        );
        totalScore += breakdown.styles * 0.1;
        totalWeight += 0.1;
    }

    // 6. Tag match (5% weight)
    breakdown.tag = (srcNode.tagName === cmpNode.tagName) ? 1.0 : 0.0;
    totalScore += breakdown.tag * 0.05;
    totalWeight += 0.05;

    // Normalize total score
    breakdown.total = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
        total: breakdown.total,
        breakdown
    };
};

/**
 * Determine match type based on similarity characteristics
 */
const determineMatchType = (srcNode, cmpNode, score) => {
    if (srcNode.elementId === cmpNode.elementId) {
        if (score > 0.95) return 'exact';
        return 'exact_path_different_properties';
    }

    if (srcNode.id && srcNode.id === cmpNode.id) {
        return 'moved_by_id';
    }

    if (score > 0.9) return 'high_confidence';
    if (score > 0.85) return 'good_match';
    return 'possible_match';
};

// Dedicated function for ID similarity calculation
function calculateIdSimilarity(srcNode, cmpNode) {
    // If neither node has an ID, return null (no comparison needed)
    if (!srcNode.id && !cmpNode.id) {
        return {
            score:1.0,
            weight:0,
            reason:'no_ids_to_match'
        };
    }

    // Helper function to detect if ID appears to be dynamic
    function isDynamicId(id) {
        if (!id) return false;
        
        const dynamicPatterns = [
            /[0-9a-f]{8,}/i,           // Long hex strings (8+ chars)
            /\d{10,}/,                 // Long numbers (timestamps, etc.)
            /-(uuid|[0-9a-f]{6,})/i,   // UUID-like suffixes
            /\d{4,}-\d{4,}/,          // Timestamp-like patterns
            /_\d{8,}/,                // Underscore followed by long number
        ];
        
        return dynamicPatterns.some(pattern => pattern.test(id));
    }

    // Helper function to extract base ID (remove dynamic parts)
    function getBaseId(id) {
        if (!id) return null;
        return id.replace(/[0-9a-f]{6,}/gi, 'DYNAMIC');
    }

    // Perfect match
    if (srcNode.id === cmpNode.id && srcNode.id !== null) {
        return {
            score: 1.0,
            weight: 0.15,
            reason: 'exact_match'
        };
    }

    // Check for structural similarity (same base, different dynamic parts)
    const srcBase = getBaseId(srcNode.id);
    const cmpBase = getBaseId(cmpNode.id);
    
    if (srcBase === cmpBase && srcBase !== null && srcBase !== 'DYNAMIC') {
        return {
            score: 0.8,
            weight: 0.15,
            reason: 'base_match'
        };
    }

    // Check if either ID appears to be dynamic
    const srcIsDynamic = isDynamicId(srcNode.id);
    const cmpIsDynamic = isDynamicId(cmpNode.id);

    if (srcIsDynamic || cmpIsDynamic) {
        // One or both IDs are dynamic - reduce impact on overall score
        return {
            score: 0.5,
            weight: 0.05, // Significantly reduced weight
            reason: 'dynamic_id_detected'
        };
    }

    // Check for prefix similarity (common pattern in component IDs)
    if (srcNode.id && cmpNode.id) {
        const srcPrefix = srcNode.id.split(/[0-9a-f]{6,}/i)[0];
        const cmpPrefix = cmpNode.id.split(/[0-9a-f]{6,}/i)[0];
        
        if (srcPrefix && cmpPrefix && srcPrefix === cmpPrefix && srcPrefix.length > 5) {
            return {
                score: 0.7,
                weight: 0.08, // Reduced weight for partial match
                reason: 'prefix_match'
            };
        }
    }

    // True mismatch - but don't penalize heavily in case of false positive
    return {
        score: 0.0,
        weight: 0.1, // Reduced weight to minimize impact
        reason: 'no_match'
    };
}

/**
 * Calculate path similarity with nuanced scoring
 */
const calculatePathSimilarity = (path1, path2) => {
    if (path1.depth !== path2.depth) {
        // Different depths get penalized
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
            score += 0.6; // Tag match

            const idx1 = part1.match(/\[(\d+)\]/)?.[1];
            const idx2 = part2.match(/\[(\d+)\]/)?.[1];

            if (idx1 === idx2) {
                score += 0.4; // Index match
            } else if (idx1 && idx2) {
                const diff = Math.abs(parseInt(idx1) - parseInt(idx2));
                score += Math.max(0, 0.4 - (diff * 0.1)); // Partial credit for close indices
            }
        }
    }

    return score / depth;
};

/**
 * Calculate class similarity using Jaccard coefficient
 */
const calculateClassSimilarity = (classes1, classes2) => {
    if (classes1.length === 0 && classes2.length === 0) return 1;
    if (classes1.length === 0 || classes2.length === 0) return 0;

    const set1 = new Set(classes1);
    const set2 = new Set(classes2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / classes1.length;
};

/**
 * Calculate style similarity
 */
const calculateStyleSimilarity = (styles1, styles2) => {
    const importantStyles = ['display', 'position', 'visibility', 'overflow'];
    let matches = 0;

    for (const style of importantStyles) {
        if (styles1[style] === styles2[style]) {
            matches++;
        }
    }

    return matches / importantStyles.length;
};

/**
 * Calculate size similarity with tolerance for responsive layouts
 */
const calculateSizeSimilarity = (box1, box2) => {
    // Height similarity is more important than width (responsive layouts)
    const heightRatio = Math.min(box1.height, box2.height) /
        Math.max(box1.height, box2.height);

    const widthRatio = Math.min(box1.width, box2.width) /
        Math.max(box1.width, box2.width);

    // Weight height more than width
    return (heightRatio * 0.7) + (widthRatio * 0.3);
};

/**
 * Parse element ID into structured format
 */
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
        console.log(`   Number of elements: ${Array.isArray(data) ? data.length : 'N/A'}`);
    } catch (error) {
        console.error(`Failed to save file: ${filename}`, error.message);
        throw error;
    }
}

async function getData(url, screenshotWidth = null, screenshotHeight = null) {
    const elementData = await downloadJSONFile(url);
    
    // Filter elements based on screenshot dimensions if provided
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
        fullData: filteredElementData  // Keep only filtered data for saving
    };
}

async function downloadAndSaveData(baseElementData, compElementData, baseScreenshotWidth = null, baseScreenshotHeight = null, compScreenshotWidth = null, compScreenshotHeight = null) {
    try {
        console.log('Starting download process...\n');

        // Download base data
        console.log(' Downloading base data...');
        const baseResult = await getData(baseElementData, baseScreenshotWidth, baseScreenshotHeight);

        // Save base data
        await saveToFile(baseResult.fullData, 'baseData.json');

        // Download comparison data
        console.log('\n Downloading comparison data...');
        const compResult = await getData(compElementData, compScreenshotWidth, compScreenshotHeight);

        // Save comparison data
        await saveToFile(compResult.fullData, 'compData.json');

        // Optional: Save just the elementIds to separate files
        console.log('\n Saving elementId arrays...');
        await saveToFile(baseResult.elementIds, 'baseElementIds.json');
        await saveToFile(compResult.elementIds, 'compElementIds.json');

        console.log('\n✨ All files saved successfully!');

        // Return the data for further processing if needed
        return {
            baseData: baseResult.fullData,
            compData: compResult.fullData,
            baseElementIds: baseResult.elementIds,
            compElementIds: compResult.elementIds
        };

    } catch (error) {
        console.error('Error in download process:', error.message);
        throw error;
    }
}

const getSimilarityBetweenNodes = (node1, node2) => {
    const similarity = calculateComprehensiveSimilarity(node1, node2, parseElementId(node1.elementId), parseElementId(node2.elementId));
    console.log({
        node1,
        node2,
        similarity
    });
}
// Execute the download and save process
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

        const result = await downloadAndSaveData(
            baseElementData, 
            compElementData,
            baseDimensions.width,
            baseDimensions.height,
            compDimensions.width,
            compDimensions.height
        );

        const nodeData1 = await getData(baseElementData, baseDimensions.width, baseDimensions.height);
        const nodeData2 = await getData(compElementData, compDimensions.width, compDimensions.height);

        // getSimilarityBetweenNodes(nodeData1.fullData[697], nodeData2.fullData[681]);

        const layoutdiffs1 = findLayoutDifferences(nodeData1.fullData, nodeData2.fullData);
        await saveToFile(layoutdiffs1, 'report1.json');

        const payload = {
            mismatchedBoxes1: layoutdiffs1.extraInSource.map(e => ({ top: e.node.box.y, left: e.node.box.x, width: e.node.box.width, height: e.node.box.height })),
            mismatchedBoxes2: layoutdiffs1.extraInCompare.map(e => ({ top: e.node.box.y, left: e.node.box.x, width: e.node.box.width, height: e.node.box.height }))
        }
        await saveToFile(payload, 'mismatchedBoxes.json');

        console.log('Parsed URL pieces:', {
            baseOrigin, orgId, projectId, baseBuildId, compBuildId, screenshotName
        });

        const firstScreenshotPath = `${screenshotName}_base.png`;
        const secondScreenshotPath = `${screenshotName}_comp.png`;


        const res = await paintScreenshotComparison(
            payload.mismatchedBoxes1,
            payload.mismatchedBoxes2,
            'domURL1',
            'domURL2',
            baseElementData,
            compElementData,
            firstScreenshotURL,
            secondScreenshotURL,
            [firstScreenshotPath, secondScreenshotPath],
            ["", ""]
        );
        console.log(`baseDiff : ${res.screenshots[0].misMatchPercentage} % , compDiff : ${res.screenshots[1].misMatchPercentage} %`);

        const baseDiffURL = `${stageBucketURL}/${firstScreenshotPath}`;
        const compDiffURL = `${stageBucketURL}/${secondScreenshotPath}`;

        const basePath = `./screenshots/output/base/${screenshotName}.png`;
        const compPath = `./screenshots/output/comp/${screenshotName}.png`;

        await downloadImage(baseDiffURL,basePath);
        await downloadImage(compDiffURL,compPath);

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
    downloadJSONFile,
    saveToFile,
    getData,
    downloadAndSaveData
};