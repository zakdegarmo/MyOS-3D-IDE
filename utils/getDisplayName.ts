
import type { GlyphObject, LoadedModel, PrimitiveObject } from '../types';

export const getDisplayName = (
    key: string,
    glyphObjects: GlyphObject[],
    loadedModels: LoadedModel[],
    primitiveObjects: PrimitiveObject[]
): string => {
    if (!key) return "N/A";

    if (key.startsWith('glb-model-')) {
        const model = loadedModels.find(m => m.id === key);
        return model ? model.filename : `Model (${key.slice(-4)})`;
    }
    
    if (key.startsWith('primitive-')) {
        const primitive = primitiveObjects.find(p => p.id === key);
        const typeName = primitive ? primitive.type.charAt(0).toUpperCase() + primitive.type.slice(1) : 'Primitive';
        return `${typeName} (P-${key.slice(-4)})`;
    }

    if (key.startsWith('glyph-')) {
        const glyph = glyphObjects.find(g => g.id === key);
        if (glyph) {
             const char = glyph.glyphData.char.trim() || 'Space';
             const idSuffix = key.split('-').pop()?.slice(-4) || '??';
             return `'${char}' (G-${idSuffix})`;
        }
    }
    
    return key; // Fallback
};
