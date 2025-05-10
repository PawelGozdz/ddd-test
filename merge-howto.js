#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function mergeHowToFiles() {
    try {
        // Pobierz bieżący katalog
        const currentDir = process.cwd() + '/libs/ddd2/src';
        console.log(`Bieżący katalog: ${currentDir}`);

        // Generuj timestamp
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .replace('Z', '');

        // Nazwa pliku wyjściowego
        const outputFileName = `DDD-lib-${timestamp}.md`;
        const outputPath = path.join(currentDir, outputFileName);

        console.log(`Tworzenie pliku: ${outputFileName}`);

        // Odczytaj wszystkie pliki w katalogu
        const files = await fs.readdir(currentDir);

        // Filtruj pliki HOW-TO-*.md
        const howToFiles = files
            .filter((file) => file.startsWith('HOW-TO-') && file.endsWith('.md'))
            .sort();

        if (howToFiles.length === 0) {
            console.log('Nie znaleziono plików HOW-TO-*.md');
            return;
        }

        console.log(`Znaleziono ${howToFiles.length} plików HOW-TO-*.md`);

        // Przygotuj zawartość pliku wyjściowego
        let mergedContent = '# Merged HOW-TO Documentation\n\n';
        mergedContent += `Generated on: ${new Date().toISOString()}\n\n`;
        mergedContent += '---\n\n';

        // Iteruj przez pliki i dodawaj ich zawartość
        for (const file of howToFiles) {
            console.log(`Przetwarzanie: ${file}`);

            const filePath = path.join(currentDir, file);
            const content = await fs.readFile(filePath, 'utf8');

            // Dodaj separatory i nagłówek dla każdego pliku
            mergedContent += `## File: ${file}\n\n`;
            mergedContent += content;
            mergedContent += '\n\n---\n\n';
        }

        // Zapisz połączoną zawartość do pliku
        await fs.writeFile(outputPath, mergedContent, 'utf8');

        console.log(`\n✓ Pomyślnie utworzono plik: ${outputFileName}`);
        console.log(`✓ Połączono ${howToFiles.length} plików HOW-TO`);
    } catch (error) {
        console.error('Błąd podczas przetwarzania:', error.message);
        process.exit(1);
    }
}

// Uruchom główną funkcję
mergeHowToFiles();
