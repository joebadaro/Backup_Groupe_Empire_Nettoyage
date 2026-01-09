import fs from 'fs';
import path from 'path';

const filePath = 'c:\\Users\\joeba\\OneDrive\\Desktop\\Backup_Groupe_Empire_Nettoyage\\src\\components\\EstimationModule.astro';

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Function to fix common windows-1252/utf-8 mixups
    // The pattern is that UTF-8 bytes were interpreted as Latin-1 and then saved again as UTF-8

    // We can try to reverse this by interpreting the string as Latin-1 and then reading buffer as UTF-8
    // But since we are in JS, we can just replace the common mojibake sequences.

    const replacements = [
        { find: /Ã©/g, replace: 'é' },
        { find: /Ã /g, replace: 'à' },
        { find: /Ã¨/g, replace: 'è' },
        { find: /Ã´/g, replace: 'ô' },
        { find: /Ãª/g, replace: 'ê' },
        { find: /Ã®/g, replace: 'î' },
        { find: /Ã§/g, replace: 'ç' },
        { find: /Ã»/g, replace: 'û' },
        { find: /Ã«/g, replace: 'ë' },
        { find: /Ã¯/g, replace: 'ï' },
        { find: /Ã±/g, replace: 'ñ' },
        { find: /â€™/g, replace: "'" }, // Right single quotation mark
        { find: /â€“/g, replace: "–" }, // En dash
        { find: /â€”/g, replace: "—" }, // Em dash
        { find: /â€¦/g, replace: "..." }, // Ellipsis
        { find: /â€¢/g, replace: "•" }, // Bullet
        { find: /â†/g, replace: "←" }, // Left arrow - from â† (which is E2 86 of arrow, seen as â and † ?) 
        // Wait, â† is probably partial. 
        // Let's do a more robust approach using Buffer if possible.
    ];

    // Better approach: mimic the double encoding repair
    // Content is currently "Ã©". "Ã" is \u00c3, "©" is \u00a9.
    // We want byte 0xC3 0xA9.

    // Let's try to encode to binary string (latin1) and decode to utf8
    // But we need to be careful not to break valid characters if the file is mixed.
    // However, looking at the file, it seems consistently broken.

    // A simple heuristic buffer reconstruction:
    const fixedContent = Buffer.from(content, 'binary').toString('utf-8');

    // Check if that worked for a known bad string
    if (fixedContent.includes('immÃ©diate')) {
        console.log('Buffer trick did not work directly (maybe it was read as utf8 already).');
        // If content is already "Ã©" (unicode chars), then binary write might just write their bytes.
        // Let's try replacing locally.
    }

    // Manual replacements are safer if we are unsure of the exact corruption chain.
    // Let's add the emoji ones seen in the provided text.
    // ðŸ”¥ -> 🔥 (0xF0 0x9F 0x94 0xA5)
    // ðŸ is \u00f0 \u0178.

    let repaired = content;

    // Simple Latin1 to UTF8 repair map
    const map = {
        'Ã©': 'é',
        'Ã ': 'à',
        'Ã¨': 'è',
        'Ã´': 'ô',
        'Ãª': 'ê',
        'Ã®': 'î',
        'Ã§': 'ç',
        'Ã»': 'û',
        'Ã«': 'ë',
        'Ã¯': 'ï',
        'Ã±': 'ñ',
        'Ã¢': 'â',
        'â€™': "'",
        // Arrow attempts
        'â†': '←',
        'â–¼': '▼',
        'â–²': '▲',
        // Emojis (approximate based on common mojibake starts)
        'ðŸ”¥': '🔥',
        'ðŸ': '🚿', // Just a guess? No, let's look at specific ones
        'ðŸ ·ï¸': '🏷️', // This one in line 34: ðŸ ·ï¸
        // line 34 was: <div class="welcome-banner-icon">ðŸ ·ï¸ </div>
        // 0xF0 0x9F 0x8F 0xB7 (Label) + VS16
    };

    // Generic "binary string" repair
    // convert string to buffer treating each char code as a byte (if < 256)
    // This assumes the file was read as UTF-8 but the bytes were actually intended to be UTF-8 but were interpreted as Latin-1.
    // e.g. "é" (0xC3 0xA9) became "Ã" (0xC3) and "©" (0xA9).
    // So reading "Ã©" gives char codes 0xC3 and 0xA9.

    const bytes = new Uint8Array(content.length);
    let valid = true;
    for (let i = 0; i < content.length; i++) {
        const code = content.charCodeAt(i);
        if (code > 255) {
            // Found a char > 255, which implies it's NOT simple Latin-1 mojibake, or it's a mix.
            // E.g. "ï¸" is \u00ef \u00b8? No, \u00ef is 0xEF.
            // "ðŸ" -> ð (\u00f0) and Ÿ (\u0178). 0178 > 00FF.
            // So Ÿ is NOT a single byte in Latin-1. 
            // This suggests it might be Windows-1252 to UTF-8.
            // The byte 0x9F in Windows-1252 converts to \u0178 (Ÿ).
            // So yes, simple Latin-1 won't work, we need Windows-1252 reverse map.
            if (code === 0x0178) { // Ÿ
                bytes[i] = 0x9F;
            } else if (code === 0x20AC) { // €
                bytes[i] = 0x80;
            } else if (code === 0x201A) { // ‚
                bytes[i] = 0x82;
            } else if (code === 0x0192) { // ƒ
                bytes[i] = 0x83;
            } else if (code === 0x201E) { // „
                bytes[i] = 0x84;
            } else if (code === 0x2026) { // …
                bytes[i] = 0x85;
            } else if (code === 0x2020) { // †
                bytes[i] = 0x86;
            } else if (code === 0x2021) { // ‡
                bytes[i] = 0x87;
            } else if (code === 0x02C6) { // ˆ
                bytes[i] = 0x88;
            } else if (code === 0x2030) { // ‰
                bytes[i] = 0x89;
            } else if (code === 0x0160) { // Š
                bytes[i] = 0x8A;
            } else if (code === 0x2039) { // ‹
                bytes[i] = 0x8B;
            } else if (code === 0x0152) { // Œ
                bytes[i] = 0x8C;
            } else if (code === 0x017D) { // Ž
                bytes[i] = 0x8E;
            } else if (code === 0x2018) { // ‘
                bytes[i] = 0x91;
            } else if (code === 0x2019) { // ’
                bytes[i] = 0x92;
            } else if (code === 0x201C) { // “
                bytes[i] = 0x93;
            } else if (code === 0x201D) { // ”
                bytes[i] = 0x94;
            } else if (code === 0x2022) { // •
                bytes[i] = 0x95;
            } else if (code === 0x2013) { // –
                bytes[i] = 0x96;
            } else if (code === 0x2014) { // —
                bytes[i] = 0x97;
            } else if (code === 0x02DC) { // ˜
                bytes[i] = 0x98;
            } else if (code === 0x2122) { // ™
                bytes[i] = 0x99;
            } else if (code === 0x0161) { // š
                bytes[i] = 0x9A;
            } else if (code === 0x203A) { // ›
                bytes[i] = 0x9B;
            } else if (code === 0x0153) { // œ
                bytes[i] = 0x9C;
            } else if (code === 0x017E) { // ž
                bytes[i] = 0x9E;
            } else {
                // Keep as is if allowed, or fail?
                // If it is > 255 but not one of the CP1252 mappings, it's just a regular char?
                // Most mojibake is < 256.
                // Let's assume regular chars are fine and we only fix bad sequences? No, the file is Corrupted.
                // If there are chinese chars or valid emojis, they would be huge codes.
                // But the file is mostly ASCII + corrupted non-ascii.
                // Let's just cast to byte and hope? No.
                // Let's use the replacement map for known issues first, it is safer.
                valid = false;
            }
        } else {
            bytes[i] = code;
        }
    }

    if (valid) {
        // Try to decode
        try {
            const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            console.log("Re-decoding successful!");
            repaired = decoded;
        } catch (e) {
            console.log("Re-decoding failed, invalid utf-8 sequences.");
            // Fallback to manual replacement
            for (const [key, val] of Object.entries(map)) {
                repaired = repaired.split(key).join(val);
            }
        }
    } else {
        console.log("Complex chars found, using replacement map.");
        for (const [key, val] of Object.entries(map)) {
            repaired = repaired.split(key).join(val);
        }
    }

    // Write back
    fs.writeFileSync(filePath, repaired, 'utf8');
    console.log('File repaired.');

} catch (err) {
    console.error(err);
}
