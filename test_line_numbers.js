// Test file for line number tracking
console.log('This is line 2');

console.log('This is line 4');

// Some calculation
let x = 5;
let y = 10;
console.log('Line 9: x + y =', x + y);

// Array operations
let numbers = [1, 2, 3, 4, 5];
console.log('Line 13: numbers array:', numbers);

// Function call
function testFunction() {
    console.log('Line 17: Inside function');
    return 'function result';
}

let result = testFunction();
console.log('Line 22: Function returned:', result);

// Template literal test (this was causing the original issue)
let name = 'World';
console.log(`Line 26: Hello, ${name}!`);

// Diamond pattern test
let size = 3;
let diamond = Array.from({length: size}, (_, i) => {
    let spaces = ' '.repeat(size - i - 1);
    let stars = '*'.repeat(2 * i + 1);
    console.log(`Line ${32 + i}: Creating diamond row ${i + 1}`);
    return `${spaces}${stars}`;
}).join('\n');

console.log('Line 36: Diamond pattern:');
console.log(diamond);
