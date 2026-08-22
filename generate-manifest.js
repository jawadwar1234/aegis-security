import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data', 'natural_images');
const OUTPUT_FILE = path.join(__dirname, 'dataset-manifest.json');

function generateManifest() {
    console.log(`Scanning dataset in: ${DATA_DIR}...`);
    
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`Error: Directory not found: ${DATA_DIR}`);
        process.exit(1);
    }

    const categories = fs.readdirSync(DATA_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const manifest = {
        generatedAt: new Date().toISOString(),
        totalCategories: categories.length,
        totalImages: 0,
        categories: {}
    };

    categories.forEach(cat => {
        const catDir = path.join(DATA_DIR, cat);
        const images = fs.readdirSync(catDir)
            .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
            .map(file => `data/natural_images/${cat}/${file}`);

        manifest.categories[cat] = images;
        manifest.totalImages += images.length;
        console.log(`- Category [${cat}]: ${images.length} images`);
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`\nManifest generated successfully! Total images: ${manifest.totalImages}`);
    console.log(`Saved to: ${OUTPUT_FILE}`);
}

generateManifest();
