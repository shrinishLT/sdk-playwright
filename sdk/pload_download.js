const axios = require('axios');
const { sign } = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const baseURL = 'https://automation-dotlapse-artefact.lambdatest.com/org-833575/188cc85d-b952-4cd1-ae3d-66cb82d35104/9936554d-0bb2-4330-8251-181d952426e6/elementsData/THINGS_TO_DO_canary_chrome_1366x0.json';
const compURL = 'https://automation-dotlapse-artefact.lambdatest.com/org-833575/188cc85d-b952-4cd1-ae3d-66cb82d35104/942479ad-631d-4dcf-8ec2-d9f8f94a250d/elementsData/THINGS_TO_DO_canary_chrome_1366x0.json';




const arraysEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  for (let item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
};

const calculatePathSimilarity = (path1, path2) => {
  if (path1.depth !== path2.depth) {
    return 0;
  }
  
  let matchCount = 0;
  let totalComparisons = path1.parts.length;
  
  for (let i = 0; i < path1.parts.length; i++) {
    const part1 = path1.parts[i];
    const part2 = path2.parts[i];
    
    // Extract tag and index
    const tag1 = part1.replace(/\[\d+\]/, '');
    const tag2 = part2.replace(/\[\d+\]/, '');
    
    if (tag1 === tag2) {
      matchCount += 0.7; // Tag match gives 70% weight
      
      // Check index match
      const idx1 = part1.match(/\[(\d+)\]/)?.[1];
      const idx2 = part2.match(/\[(\d+)\]/)?.[1];
      
      if (idx1 === idx2) {
        matchCount += 0.3; // Exact index match gives additional 30%
      } else if (idx1 && idx2) {
        // Partial credit for close indices
        const diff = Math.abs(parseInt(idx1) - parseInt(idx2));
        if (diff <= 2) {
          matchCount += 0.15; // Close index gives 15%
        }
      }
    }
  }
  
  return matchCount / totalComparisons;
};

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

const areNodesStructurallyCompatible = (srcNode, cmpNode) => {
  // Different display types are usually not compatible
//   if (srcNode.styles?.relevant?.display !== cmpNode.styles?.relevant?.display) {
//     // Exception: block and flex can sometimes be interchangeable
//     const displays = [srcNode.styles?.relevant?.display, cmpNode.styles?.relevant?.display];
//     if (!(displays.includes('block') && displays.includes('flex'))) {
//       return false;
//     }
//   }
  
  // Check size compatibility (avoid matching tiny elements with large ones)
  if (srcNode.box && cmpNode.box) {
    const srcArea = srcNode.box.width * srcNode.box.height;
    const cmpArea = cmpNode.box.width * cmpNode.box.height;
    
    // If one is more than 10x larger than the other, probably not compatible
    if (srcArea > 0 && cmpArea > 0) {
      const ratio = Math.max(srcArea, cmpArea) / Math.min(srcArea, cmpArea);
      if (ratio > 10) {
        return false;
      }
    }
  }
  
  // Check visibility compatibility
  if (srcNode.styles?.relevant?.visibility !== cmpNode.styles?.relevant?.visibility) {
    return false;
  }
  
  return true;
};

const arePathsStructurallyCompatible = (path1, path2) => {
  // Paths must be at same depth
  if (path1.depth !== path2.depth) return false;
  
  // Check critical path differences
  // Button elements should not match with non-button elements
  const path1HasButton = path1.parts.some(p => p.startsWith('button'));
  const path2HasButton = path2.parts.some(p => p.startsWith('button'));
  
  if (path1HasButton !== path2HasButton) {
    return false;
  }
  
  // Form elements should not match with non-form elements
  const formElements = ['form', 'input', 'select', 'textarea', 'button'];
  const path1HasForm = path1.parts.some(p => 
    formElements.some(el => p.startsWith(el))
  );
  const path2HasForm = path2.parts.some(p => 
    formElements.some(el => p.startsWith(el))
  );
  
  if (path1HasForm !== path2HasForm) {
    return false;
  }
  
  return true;
};


/**
 * Calculate similarity between two sets of classes
 */
const calculateClassSimilarity = (classes1, classes2) => {
  if (classes1.length === 0 && classes2.length === 0) return 1;
  if (classes1.length === 0 || classes2.length === 0) return 0;
  
  const set1 = new Set(classes1);
  const set2 = new Set(classes2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

/**
 * Calculate similarity between style objects
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
 * Calculate size similarity between two boxes
 */
const calculateSizeSimilarity = (box1, box2) => {
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  
  if (area1 === 0 || area2 === 0) return 0;
  
  const ratio = Math.min(area1, area2) / Math.max(area1, area2);
  return ratio; // Returns 0-1, where 1 is identical size
};

const calculateEnhancedSimilarity = (srcNode, cmpNode, srcPath, cmpPath) => {
  let score = 0;
  let weights = 0;
  
  // 1. Path similarity (40% weight)
  const pathSim = calculatePathSimilarity(srcPath, cmpPath);
  score += pathSim * 0.4;
  weights += 0.4;
  
  // 2. Class similarity (30% weight)
  if (srcNode.classes?.length > 0 || cmpNode.classes?.length > 0) {
    const classSim = calculateClassSimilarity(srcNode.classes || [], cmpNode.classes || []);
    score += classSim * 0.3;
    weights += 0.3;
  }
  
  // 3. Style similarity (20% weight)
  if (srcNode.styles?.relevant && cmpNode.styles?.relevant) {
    const styleSim = calculateStyleSimilarity(srcNode.styles.relevant, cmpNode.styles.relevant);
    score += styleSim * 0.2;
    weights += 0.2;
  }
  
  // 4. Size similarity (10% weight)
  if (srcNode.box && cmpNode.box) {
    const sizeSim = calculateSizeSimilarity(srcNode.box, cmpNode.box);
    score += sizeSim * 0.1;
    weights += 0.1;
  }
  
  return weights > 0 ? score / weights : 0;
};

const areParallelStructures = (path1, path2) => {
  if (path1.depth !== path2.depth) return false;

  // Check if the paths have the same structure (tags match)
   for (let i = 0; i < path1.parts.length; i++) {
    const tag1 = path1.parts[i].replace(/\[\d+\]/, '');
    const tag2 = path2.parts[i].replace(/\[\d+\]/, '');
    
    if (tag1 !== tag2) {
      return false; // Different tag structure
    }
  }
  
  // They have the same tag structure, could be parallel elements
  return true;
};

const findLayoutDifferences = (sourceNodes, compareNodes, options = {}) => {
  const { 
    detectMoved = true,  // Detect elements that moved position
    detectRepeated = true,  // Detect repeated patterns (like list items)
    minSimilarity = 0.85,  // Minimum similarity threshold for fuzzy matching
    requireClassMatch = true,  // Require at least one common class for fuzzy matches
  } = options;

    const results = {
        exactMatches: [],        
        fuzzyMatches: [],        
        movedElements: [],       
        repeatedPatterns: new Map(),
        extraInSource: [],       
        extraInCompare: [],      
        matchedPairs: new Map(), 
        unmatchedSource: [],     
        unmatchedCompare: []     
    };

  // Track which compare nodes have been matched
    const matchedCompareNodes = new Set();
    const matchedSourceNodes = new Set();
  
  // Group nodes by tagName and depth for efficient comparison
  const compareNodeMap = new Map();
  compareNodes.forEach(node => {
    const path = parseElementId(node.elementId);
    if (!path) return;
    
    const key = `${node.tagName}_${path.depth}`;
    if (!compareNodeMap.has(key)) {
        compareNodeMap.set(key, []);
    }
    compareNodeMap.get(key).push({ node, path });
    });

    sourceNodes.forEach(srcNode => {
    const srcPath = parseElementId(srcNode.elementId);
    if (!srcPath) {
      results.extraInSource.push(srcNode);
      results.unmatchedSource.push({
        element: srcNode,
        reason: 'invalid_path'
      });
      return;
    }
    
    const key = `${srcNode.tagName}_${srcPath.depth}`;
    const candidates = compareNodeMap.get(key) || [];
    
    // Check for exact match
    const exactMatch = candidates.find(c => 
        c.node.elementId === srcNode.elementId
    );
    
    if (exactMatch) {
      // Track exact match
        matchedSourceNodes.add(srcNode.elementId);
        matchedCompareNodes.add(exactMatch.node.elementId);
        results.matchedPairs.set(srcNode.elementId, exactMatch.node.elementId);

        results.exactMatches.push({
        sourceElement: srcNode.elementId,
        compareElement: exactMatch.node.elementId,
        matchType: 'exact',
        tagName: srcNode.tagName,
        depth: srcPath.depth
        });
        return;
    }
    
    // Check for moved elements (same properties, different path)
    if (detectMoved && srcNode.id) {  // Only check if element has an ID
        const movedMatch = candidates.find(c => {
        if (matchedCompareNodes.has(c.node.elementId)) return false;
        return c.node.id === srcNode.id && 
                c.node.id !== null &&
                arraysEqual(c.node.classes || [], srcNode.classes || []);
        });

    if (movedMatch) {
        matchedSourceNodes.add(srcNode.elementId);
        matchedCompareNodes.add(movedMatch.node.elementId);
        results.matchedPairs.set(srcNode.elementId, movedMatch.node.elementId);
        
        results.movedElements.push({
            element: srcNode,
            from: srcNode.elementId,
            to: movedMatch.node.elementId,
            matchConfidence: 'high',
            matchCriteria: ['id', 'classes', 'tagName']
        });
        
        results.fuzzyMatches.push({
          sourceElement: srcNode.elementId,
          compareElement: movedMatch.node.elementId,
          matchType: 'moved',
          tagName: srcNode.tagName,
          id: srcNode.id,
          classes: srcNode.classes
        });
        return;
      }
    }
    
    // Check for repeated patterns (like list items) with STRICTER validation
    if (detectRepeated) {
      // Find candidates with enhanced validation
      const validCandidates = candidates
        .filter(c => !matchedCompareNodes.has(c.node.elementId))
        .filter(c => {
          // Additional validation before similarity check
          if (areParallelStructures(srcPath, c.path)) {
            // Additional checks for parallel structures
            
            // Must have compatible properties
            if (!areNodesStructurallyCompatible(srcNode, c.node)) {
              return false;
            }
            
            // Should have same or similar classes
            if (srcNode.classes?.length > 0 || c.node.classes?.length > 0) {
              const hasCommonClass = srcNode.classes?.some(cls => 
                c.node.classes?.includes(cls)
              );
              // For parallel structures, we want at least one common class
              if (!hasCommonClass && requireClassMatch) {
                return false;
              }
            }
            
            return true; // Allow parallel structure matching
          }
          // 1. Check if structural properties are compatible
          if (!areNodesStructurallyCompatible(srcNode, c.node)) {
            return false;
          }
          return true;
        });
      
      // Calculate similarity only for valid candidates
      const similarPaths = validCandidates
        .map(c => ({
          candidate: c,
          similarity: calculateEnhancedSimilarity(srcNode, c.node, srcPath, c.path)
        }))
        .filter(item => item.similarity > minSimilarity)
        .sort((a, b) => b.similarity - a.similarity);
      
      if (similarPaths.length > 0) {
        const bestMatch = similarPaths[0];
        matchedSourceNodes.add(srcNode.elementId);
        matchedCompareNodes.add(bestMatch.candidate.node.elementId);
        results.matchedPairs.set(srcNode.elementId, bestMatch.candidate.node.elementId);
        
        const patternKey = srcPath.parts.slice(0, -1).join('/');
        if (!results.repeatedPatterns.has(patternKey)) {
            results.repeatedPatterns.set(patternKey, []);
        }
        results.repeatedPatterns.get(patternKey).push({
            sourceElement: srcNode,
            matchedTo: bestMatch.candidate.node.elementId,
            similarity: bestMatch.similarity
        });
        
        results.fuzzyMatches.push({
            sourceElement: srcNode.elementId,
            compareElement: bestMatch.candidate.node.elementId,
            matchType: 'pattern',
            similarity: bestMatch.similarity,
            tagName: srcNode.tagName,
            patternKey: patternKey
        });
        return;
    }
    }

    // if (matchedSourceNodes.has(srcNode.elementId)) {
    //     return;
    // }

    // No match found - this is an extra element
    results.extraInSource.push(srcNode);
    results.unmatchedSource.push({
        element: srcNode,
        elementId: srcNode.elementId,
        reason: 'no_match_found',
        candidatesChecked: candidates.length,
        tagName: srcNode.tagName,
        depth: srcPath.depth,
        classes: srcNode.classes
    });
  });

  // Add summary statistics
  results.summary = {
    exactMatchCount: results.exactMatches.length,
    fuzzyMatchCount: results.fuzzyMatches.length,
    movedCount: results.movedElements.length,
    extraInSourceCount: results.extraInSource.length,
    extraInCompareCount: results.extraInCompare.length,
    matchRate: ((results.exactMatches.length + results.fuzzyMatches.length) / sourceNodes.length * 100).toFixed(2) + '%'
  };
  return results;
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
        await fs.writeFile(`./debug/${filename}`, jsonString, 'utf8');
        console.log(` Successfully saved to ${filename}`);
        console.log(`   File size: ${jsonString.length} bytes`);
        console.log(`   Number of elements: ${Array.isArray(data) ? data.length : 'N/A'}`);
    } catch (error) {
        console.error(`Failed to save file: ${filename}`, error.message);
        throw error;
    }
}

async function getData(url) {
    const elementData = await downloadJSONFile(url);
    const finalData = [];
    
    for (const item of elementData) {
        if (item.hasOwnProperty('elementId')) {
            finalData.push(item.elementId);
        }
    }
    
    return { 
        elementIds: finalData,
        fullData: elementData  // Keep full data for saving
    };
}

async function downloadAndSaveData() {
    try {
        console.log('Starting download process...\n');
        
        // Download base data
        console.log(' Downloading base data...');
        const baseResult = await getData(baseURL);
        
        // Save base data
        await saveToFile(baseResult.fullData, 'baseData.json');
        
        // Download comparison data
        console.log('\n Downloading comparison data...');
        const compResult = await getData(compURL);
        
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

// Execute the download and save process
async function main() {
    try {
        const result = await downloadAndSaveData();

        const nodeData1 = await getData(baseURL);
        const nodeData2 = await getData(compURL);

        const layoutdiffs1 = findLayoutDifferences(nodeData1.fullData, nodeData2.fullData);
        const layoutdiffs2 = findLayoutDifferences(nodeData2.fullData, nodeData1.fullData);
        // console.log('source dim group:', layoutdiffs1.dimensionGroups.source);
        await saveToFile(layoutdiffs1, 'report1.json');
        await saveToFile(layoutdiffs2, 'report2.json');

        const payload = {
            mismatchedBoxes1 : layoutdiffs1.extraInSource.map(e => ({top : e.box.y, left: e.box.x, width: e.box.width, height: e.box.height})),
            mismatchedBoxes2 : layoutdiffs2.extraInSource.map(e => ({top : e.box.y, left: e.box.x, width: e.box.width, height: e.box.height}))
        }

        await saveToFile(payload, 'mismatchedBoxes.json');

        // Display summary
        console.log('\n Summary:');
        console.log(`Base data: ${result.baseElementIds.length} elements`);
        console.log(`Comp data: ${result.compElementIds.length} elements`);
        
        // Quick diff preview
        const difference = Math.abs(result.baseElementIds.length - result.compElementIds.length);
        if (difference > 0) {
            console.log(`\  Difference detected: ${difference} elements`);
        } else {
            console.log('\n Both files have the same number of elements');
        }
        
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