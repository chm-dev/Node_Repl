// Test script for the diamond pattern that was causing issues
console.log('Testing diamond pattern generation...');

const size = 5;
const diamond = Array.from({ length: size * 2 - 1 }, (_, i) => {
    const distFromCenter = Math.abs(i - (size - 1));
    const stars = size - distFromCenter;
    const spaces = ' '.repeat(distFromCenter);
    return `${spaces}${'*'.repeat(stars)}`;
}).join('\n');

console.log('Diamond pattern:');
console.log(diamond);

// Test the reduce version that was problematic
console.log('\nTesting with reduce and template literals...');
const diamond2 = Array.from({ length: 5 }, (_, i) => {
    return [0, 1, 2, 3, 4].reduce((acc, j) => {
        const spaces = ' '.repeat(Math.abs(2 - i));
        const stars = '*'.repeat(5 - Math.abs(2 - i) * 2);
        return i === j ? `${acc}${spaces}${stars}` : acc;
    }, '');
}).filter(line => line.length > 0).join('\n');

console.log('Diamond with reduce:');
console.log(diamond2);
