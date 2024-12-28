import fs from 'fs';

import type { Printer } from '@/types/prusa';

// There should be a folder debug/<printerUUID>/<timestamp>.json for each printer.
// For every field, get the unique values and write them to a file.

// create a type where the key is the field name and the value is a set of unique values or a nested object
interface UniqueValues extends Record<string, Set<string> | UniqueValues> {}

const handlePrinter = (
    printerId: string,
    _uniqueValues: UniqueValues,
): UniqueValues => {
    const uniqueValues = _uniqueValues;
    const path = `./debug/${printerId}`;

    if (!fs.existsSync(path)) {
        console.log(`No debug data for printer ${printerId}`);
        process.exit(1);
    }

    const files = fs.readdirSync(path);

    console.log(`Found ${files.length} files for printer ${printerId}`);

    const computeRecursiveUniqueValues = (
        recursiveUniqueValues: UniqueValues,
        printer: Printer,
    ): void => {
        for (const [key, value] of Object.entries(printer)) {
            if (!recursiveUniqueValues[key]) {
                // eslint-disable-next-line no-param-reassign
                recursiveUniqueValues[key] = new Set();
            }

            if (Array.isArray(value)) {
                for (const v of value) {
                    if (recursiveUniqueValues[key] instanceof Set) {
                        recursiveUniqueValues[key].add(v);
                    }
                }
            } else if (typeof value === 'object') {
                // eslint-disable-next-line no-param-reassign
                recursiveUniqueValues[key] = recursiveUniqueValues[key] || {};
                computeRecursiveUniqueValues(
                    recursiveUniqueValues[key] as UniqueValues,
                    value as Printer,
                );
            } else if (recursiveUniqueValues[key] instanceof Set) {
                // only add if the set has less than 50 elements
                const looksLikeUnixTimestamp =
                    typeof value === 'number' && value > 1e9;

                const shouldAdd =
                    (typeof value !== 'number' ||
                        recursiveUniqueValues[key].size < 50) &&
                    (!looksLikeUnixTimestamp ||
                        recursiveUniqueValues[key].size < 1);

                if (shouldAdd) {
                    recursiveUniqueValues[key].add(value);
                }
            } else {
                console.error('This should not happen');

                process.exit(1);
            }
        }
    };

    const getPercentage = (current: number): string =>
        ((current / files.length) * 100).toFixed(2);

    for (const file of files) {
        console.log(`Progress: ${getPercentage(files.indexOf(file))}%`);
        const data = fs.readFileSync(`${path}/${file}`, 'utf8');
        const printer = JSON.parse(data) as Printer;

        computeRecursiveUniqueValues(uniqueValues, printer);
    }

    console.log(`Progress: ${getPercentage(files.length)}%`);

    return uniqueValues;
};

const main = (): void => {
    let uniqueValues: UniqueValues = {};

    const printers = fs.readdirSync('./debug');

    console.log(`Found data for ${printers.length} printers`);

    for (const printer of printers) {
        uniqueValues = handlePrinter(printer, uniqueValues);
    }

    // log so that it does not say [Set] but the actual values
    const data = JSON.stringify(
        uniqueValues,
        (_key, value) => {
            if (value instanceof Set) {
                return Array.from(value);
            }

            return value;
        },
        2,
    );

    fs.writeFileSync('./uniqueValues.json', data);

    console.log('Unique values written to uniqueValues.json');
};

main();
