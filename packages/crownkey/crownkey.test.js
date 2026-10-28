import { renderCrownKey, validateCrownKeyFormat, normalizeParcelMatch } from './index.js';
import assert from 'assert';

console.log('Testing CrownKey Display Cases...');

// Case 1: Property known, no event -> COUNTY-PARCEL
const case1 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000' });
assert.strictEqual(case1, 'DUV-091823-0000');
assert.strictEqual(validateCrownKeyFormat(case1).caseType, 1);
console.log('✓ Case 1 passed:', case1);

// Case 2: Source known, no event -> COUNTY-PARCEL · SOURCE
const case2 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000', firstSourceCode: 'MAIL' });
assert.strictEqual(case2, 'DUV-091823-0000 · MAIL');
assert.strictEqual(validateCrownKeyFormat(case2).caseType, 2);
console.log('✓ Case 2 passed:', case2);

// Case 3: Event and source known -> COUNTY-PARCEL-PILLAR-NNN · SOURCE
const case3 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000', pillarCode: 'FC', eventNumber: 1, firstSourceCode: 'MAIL' });
assert.strictEqual(case3, 'DUV-091823-0000-FC-001 · MAIL');
assert.strictEqual(validateCrownKeyFormat(case3).caseType, 3);
console.log('✓ Case 3 passed:', case3);

// Case 4: Event, source unknown -> COUNTY-PARCEL-PILLAR-NNN
const case4 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000', pillarCode: 'FC', eventNumber: 2 });
assert.strictEqual(case4, 'DUV-091823-0000-FC-002');
assert.strictEqual(validateCrownKeyFormat(case4).caseType, 4);
console.log('✓ Case 4 passed:', case4);

// Case 5: Parcel unknown -> Property pending
const case5 = renderCrownKey({ firstSourceCode: 'INBOUND_WEB' });
assert.strictEqual(case5, 'Property pending');
assert.strictEqual(validateCrownKeyFormat(case5).caseType, 5);
console.log('✓ Case 5 passed:', case5);

// Preservation of leading zeros and punctuation
const preservedZero = renderCrownKey({ countyCode: 'DUV', parcelRaw: '001234-5678-00' });
assert.strictEqual(preservedZero, 'DUV-001234-5678-00');
assert.strictEqual(normalizeParcelMatch('001234-5678-00'), '001234567800');
console.log('✓ Leading-zero preservation passed:', preservedZero);

console.log('All CrownKey unit tests passed successfully!');
