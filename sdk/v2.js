const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const baseURL = 'https://automation-dotlapse-artefact.lambdatest.com/org-833575/188cc85d-b952-4cd1-ae3d-66cb82d35104/9936554d-0bb2-4330-8251-181d952426e6/elementsData/THINGS_TO_DO_canary_chrome_1366x0.json';
const compURL = 'https://automation-dotlapse-artefact.lambdatest.com/org-833575/188cc85d-b952-4cd1-ae3d-66cb82d35104/942479ad-631d-4dcf-8ec2-d9f8f94a250d/elementsData/THINGS_TO_DO_canary_chrome_1366x0.json';

const getDimensionKey = (node) => {
  if (!node?.box) return null;
  
  // Round dimensions to nearest pixel to handle minor variations
  const x = Math.round(node.box.x);
  const y = Math.round(node.box.y);
  const width = Math.round(node.box.width);
  const height = Math.round(node.box.height);
  
  return `${x}-${y}@${width}x${height}`;
};

const groupNodesByDimensions = (nodes) => {
  const groups = new Map();
  
  nodes.forEach(node => {
    const dimKey = getDimensionKey(node);
    if (!dimKey) return;
    
    if (!groups.has(dimKey)) {
      groups.set(dimKey, []);
    }
    groups.get(dimKey).push(node);
  });
  
  // Only keep groups with 2+ members (single elements don't benefit from grouping)
  const significantGroups = new Map();
  groups.forEach((members, key) => {
    if (members.length >= 2) {
      significantGroups.set(key, members);
    }
  });
  
  return significantGroups;
};


const findLayoutDifferences = (sourceNodes, compareNodes, options = {}) => {
  const {
    strictPath = false,  // If true, only exact path matches count
    detectMoved = true,  // Detect elements that moved position
    detectRepeated = true,  // Detect repeated patterns (like list items)
    minSimilarity = 0.8,  // Lowered threshold for better matching
    requireClassMatch = false,  // Don't require class match (many divs have no classes)
    allowSiblingMatch = false,  // Whether siblings can match each other
    groupByDimensions = true  // Whether to group nodes by dimensions
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
  
  // Track which nodes have been matched
  const matchedCompareNodes = new Set();
  const matchedSourceNodes = new Set();

  // PHASE 0: Create dimension groups if enabled
  let sourceDimensionGroups = new Map();
  let compareDimensionGroups = new Map();
  
  if (groupByDimensions) {
    // Group source nodes by dimensions
    sourceDimensionGroups = groupNodesByDimensions(sourceNodes);
    compareDimensionGroups = groupNodesByDimensions(compareNodes);
    
    // Store dimension groups in results for reporting
    results.dimensionGroups = {
      source: sourceDimensionGroups,
      compare: compareDimensionGroups
    };
  }
  
  // PHASE 1: Find all exact path matches first
  sourceNodes.forEach(srcNode => {
    const exactMatch = compareNodes.find(cmpNode => 
      cmpNode.elementId === srcNode.elementId && 
      !matchedCompareNodes.has(cmpNode.elementId)
    );
    
    if (exactMatch) {
      matchedSourceNodes.add(srcNode.elementId);
      matchedCompareNodes.add(exactMatch.elementId);
      results.matchedPairs.set(srcNode.elementId, exactMatch.elementId);
      
      results.exactMatches.push({
        sourceElement: srcNode.elementId,
        compareElement: exactMatch.elementId,
        matchType: 'exact',
        tagName: srcNode.tagName,
        classes: srcNode.classes
      });
    }
  });
  
  // PHASE 2: Find moved elements (with unique IDs)
  if (detectMoved) {
    sourceNodes.forEach(srcNode => {
    if (matchedSourceNodes.has(srcNode.elementId)) return;
    if (!srcNode.id) return;

    const movedMatch = compareNodes.find(cmpNode => {
        if (matchedCompareNodes.has(cmpNode.elementId)) return false;
        return cmpNode.id === srcNode.id && 
                arraysEqual(cmpNode.classes || [], srcNode.classes || []);
    });

    if (movedMatch) {
        matchedSourceNodes.add(srcNode.elementId);
        matchedCompareNodes.add(movedMatch.elementId);
        results.matchedPairs.set(srcNode.elementId, movedMatch.elementId);
        
        results.movedElements.push({
            from: srcNode.elementId,
            to: movedMatch.elementId,
            id: srcNode.id,
            classes: srcNode.classes
        });
        
        results.fuzzyMatches.push({
            sourceElement: srcNode.elementId,
            compareElement: movedMatch.elementId,
            matchType: 'moved',
            tagName: srcNode.tagName
        });
    }
    });
}

  // PHASE 3: Find parallel structure matches
    if (detectRepeated) {
    // Group unmatched nodes by structure signature
        const unmatchedSource = sourceNodes.filter(n => !matchedSourceNodes.has(n.elementId));
        const unmatchedCompare = compareNodes.filter(n => !matchedCompareNodes.has(n.elementId));
    
    // Create structure signatures for grouping
    const getStructureSignature = (node) => {
      const path = parseElementId(node.elementId);
      if (!path) return null;
      
      // Create a signature based on: depth, tag sequence, and classes
      const tagSequence = path.parts.map(p => p.replace(/\[\d+\]/, '')).join('/');
      const classSignature = (node.classes || []).sort().join(',');
      
      return {
        depth: path.depth,
        tagSequence,
        classSignature,
        node,
        path
      };
    };
    
    const sourceSignatures = unmatchedSource
      .map(getStructureSignature)
      .filter(sig => sig !== null);
    
    const compareSignatures = unmatchedCompare
      .map(getStructureSignature)
      .filter(sig => sig !== null);
    
    // Match nodes with identical structure signatures
    sourceSignatures.forEach(srcSig => {
      // Find best match from compare signatures
      let bestMatch = null;
      let bestScore = 0;
      
      compareSignatures.forEach(cmpSig => {
        if (matchedCompareNodes.has(cmpSig.node.elementId)) return;
        
        // Check if structures are compatible
        if (srcSig.depth !== cmpSig.depth) return;
        if (srcSig.tagSequence !== cmpSig.tagSequence) return;
        
        // Don't match direct siblings unless allowed
        if (!allowSiblingMatch && areSiblings(srcSig.path, cmpSig.path)) return;
        
        // Calculate match score
        let score = 0.5; // Base score for structure match
        
        // Bonus for matching classes
        if (srcSig.classSignature === cmpSig.classSignature) {
          score += 0.3;
        } else if (srcSig.classSignature && cmpSig.classSignature) {
          // Partial credit for some matching classes
          const srcClasses = new Set(srcSig.node.classes || []);
          const cmpClasses = new Set(cmpSig.node.classes || []);
          const intersection = [...srcClasses].filter(c => cmpClasses.has(c));
          if (intersection.length > 0) {
            score += 0.15 * (intersection.length / Math.max(srcClasses.size, cmpClasses.size));
          }
        }
        
        // Bonus for similar positioning
        const srcIndex = getLastIndex(srcSig.path);
        const cmpIndex = getLastIndex(cmpSig.path);
        if (srcIndex === cmpIndex) {
          score += 0.1;
        } else if (Math.abs(srcIndex - cmpIndex) <= 1) {
          score += 0.05;
        }
        
        // Bonus for compatible styles
        if (areNodesStructurallyCompatible(srcSig.node, cmpSig.node)) {
          score += 0.1;
        }
        
        if (score > bestScore && score >= minSimilarity) {
          bestScore = score;
          bestMatch = cmpSig;
        }
      });
      
      if (bestMatch) {
        matchedSourceNodes.add(srcSig.node.elementId);
        matchedCompareNodes.add(bestMatch.node.elementId);
        results.matchedPairs.set(srcSig.node.elementId, bestMatch.node.elementId);
        
        const patternKey = srcSig.path.parts.slice(0, -1).join('/');
        if (!results.repeatedPatterns.has(patternKey)) {
          results.repeatedPatterns.set(patternKey, []);
        }
        
        results.repeatedPatterns.get(patternKey).push({
          sourceElement: srcSig.node,
          matchedTo: bestMatch.node.elementId,
          similarity: bestScore
        });
        
        results.fuzzyMatches.push({
          sourceElement: srcSig.node.elementId,
          compareElement: bestMatch.node.elementId,
          matchType: 'parallel_structure',
          similarity: bestScore,
          tagName: srcSig.node.tagName,
          classes: srcSig.node.classes
        });
      }
    });
  }

  if (groupByDimensions) {
    // Track which dimension groups have at least one match
    const matchedSourceDimGroups = new Set();
    const matchedCompareDimGroups = new Set();
    
    // Check which dimension groups have matched elements
    results.matchedPairs.forEach((compareId, sourceId) => {
      const srcDimKey = getDimensionKey(sourceNodes.find(n => n.elementId === sourceId));
      const cmpDimKey = getDimensionKey(compareNodes.find(n => n.elementId === compareId));
      
      if (srcDimKey) matchedSourceDimGroups.add(srcDimKey);
      if (cmpDimKey) matchedCompareDimGroups.add(cmpDimKey);
    });
    
    // For each matched dimension group, mark all members as matched
    matchedSourceDimGroups.forEach(dimKey => {
      const groupMembers = sourceDimensionGroups.get(dimKey) || [];

      
      groupMembers.forEach(srcNode => {
        if (!matchedSourceNodes.has(srcNode.elementId)) {
          // Find an unmatched element in compare with same dimensions
          
          if (true) {
            matchedSourceNodes.add(srcNode.elementId);
            results.matchedPairs.set(srcNode.elementId, srcNode.elementId);

            results.fuzzyMatches.push({
              sourceElement: srcNode.elementId,
              compareElement: srcNode.elementId,
              matchType: 'dimension_group',
              tagName: srcNode.tagName,
              classes: srcNode.classes,
              dimensionKey: dimKey,
              note: 'Matched by dimension group association'
            });
          }
        }
      });
    });
  }
  
  // PHASE 5: Mark remaining unmatched elements
  sourceNodes.forEach(srcNode => {
    if (!matchedSourceNodes.has(srcNode.elementId)) {
      results.extraInSource.push(srcNode);
      results.unmatchedSource.push({
        element: srcNode,
        elementId: srcNode.elementId,
        reason: 'no_match_found',
        tagName: srcNode.tagName,
        classes: srcNode.classes
      });
    }
  });
  
  compareNodes.forEach(cmpNode => {
    if (!matchedCompareNodes.has(cmpNode.elementId)) {
      results.extraInCompare.push(cmpNode);
      results.unmatchedCompare.push({
        element: cmpNode,
        elementId: cmpNode.elementId,
        reason: 'no_match_from_source',
        tagName: cmpNode.tagName,
        classes: cmpNode.classes
      });
    }
  });


  
  // Add summary
  results.summary = {
    totalSourceElements: sourceNodes.length,
    totalCompareElements: compareNodes.length,
    exactMatchCount: results.exactMatches.length,
    fuzzyMatchCount: results.fuzzyMatches.length,
    movedCount: results.movedElements.length,
    extraInSourceCount: results.extraInSource.length,
    extraInCompareCount: results.extraInCompare.length,
    matchRate: ((results.exactMatches.length + results.fuzzyMatches.length) / sourceNodes.length * 100).toFixed(2) + '%'
  };
  
  return results;
};

/**
 * Parse elementId to extract structural information
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

/**
 * Get the last index from a path
 */
const getLastIndex = (path) => {
  const lastPart = path.parts[path.parts.length - 1];
  const match = lastPart.match(/\[(\d+)\]/);
  return match ? parseInt(match[1]) : -1;
};

/**
 * Check if two elements are siblings
 */
const areSiblings = (path1, path2) => {
  if (path1.depth !== path2.depth) return false;
  
  // Check if all parts except the last are exactly the same
  for (let i = 0; i < path1.parts.length - 1; i++) {
    if (path1.parts[i] !== path2.parts[i]) {
      return false;
    }
  }
  
  // They have the same parent, check if different positions
  return path1.parts[path1.parts.length - 1] !== path2.parts[path2.parts.length - 1];
};

/**
 * Check if two nodes are structurally compatible
 */
const areNodesStructurallyCompatible = (srcNode, cmpNode) => {
  // Check display compatibility
  if (srcNode.styles?.relevant?.display !== cmpNode.styles?.relevant?.display) {
    const displays = [srcNode.styles?.relevant?.display, cmpNode.styles?.relevant?.display];
    // Allow block/flex interchange in some cases
    if (!(displays.includes('block') && displays.includes('flex'))) {
      return false;
    }
  }
  
  // Check visibility
  if (srcNode.styles?.relevant?.visibility !== cmpNode.styles?.relevant?.visibility) {
    return false;
  }
  
  // Check overflow settings (can indicate different behavior)
  const srcOverflow = srcNode.styles?.relevant?.overflow;
  const cmpOverflow = cmpNode.styles?.relevant?.overflow;
  
  // If both have overflow settings and they're very different, might not be compatible
  if (srcOverflow && cmpOverflow) {
    if ((srcOverflow === 'hidden' && cmpOverflow === 'visible') ||
        (srcOverflow === 'visible' && cmpOverflow === 'hidden')) {
      // This is OK - common difference
    }
  }
  
  return true;
};

/**
 * Utility function to compare arrays
 */
const arraysEqual = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  for (let item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
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
        console.log(`✅ Successfully saved to ${filename}`);
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
        console.log('📥 Downloading base data...');
        const baseResult = await getData(baseURL);
        
        // Save base data
        await saveToFile(baseResult.fullData, 'baseData.json');
        
        // Download comparison data
        console.log('\n📥 Downloading comparison data...');
        const compResult = await getData(compURL);
        
        // Save comparison data
        await saveToFile(compResult.fullData, 'compData.json');
        
        // Optional: Save just the elementIds to separate files
        console.log('\n📝 Saving elementId arrays...');
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
        console.error('❌ Error in download process:', error.message);
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

        await saveToFile(layoutdiffs1, 'report1.json');
        await saveToFile(layoutdiffs2, 'report2.json');

        const payload = {
            mismatchedBoxes1 : layoutdiffs1.extraInSource.map(e => ({top : e.box.y, left: e.box.x, width: e.box.width, height: e.box.height})),
            mismatchedBoxes2 : layoutdiffs2.extraInSource.map(e => ({top : e.box.y, left: e.box.x, width: e.box.width, height: e.box.height}))
        }

        await saveToFile(payload, 'mismatchedBoxes.json');

        // Display summary
        console.log('\n📊 Summary:');
        console.log(`Base data: ${result.baseElementIds.length} elements`);
        console.log(`Comp data: ${result.compElementIds.length} elements`);
        
        // Quick diff preview
        const difference = Math.abs(result.baseElementIds.length - result.compElementIds.length);
        if (difference > 0) {
            console.log(`\n⚠️  Difference detected: ${difference} elements`);
        } else {
            console.log('\n✅ Both files have the same number of elements');
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