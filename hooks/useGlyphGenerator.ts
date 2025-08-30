
import { useState, useCallback } from 'react';
import * as opentype from 'opentype.js';
import * as THREE from 'three';
import { GlyphData } from '../types';

export const useGlyphGenerator = () => {
  const [font, setFont] = useState<opentype.Font | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState<boolean>(false);
  const [isFontLoading, setIsFontLoading] = useState<boolean>(false);
  const [availableGlyphs, setAvailableGlyphs] = useState<string[]>([]);
  
  const loadFont = useCallback(async (fontFile: File) => {
    if (!fontFile) return;
    setIsFontLoading(true);
    setFontLoaded(false);
    setFont(null);
    setError(null);
    setAvailableGlyphs([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fontBuffer = e.target?.result as ArrayBuffer;
        if (!fontBuffer) throw new Error("Could not read file.");
        const loadedFont = opentype.parse(fontBuffer);
        setFont(loadedFont);
        setFontLoaded(true);

        const glyphs: string[] = [];
        for (let i = 0; i < loadedFont.numGlyphs; i++) {
            const glyph = loadedFont.glyphs.get(i);
            // Ensure glyph has a unicode value, a path, and is not in a private use area
            if (glyph.unicode && glyph.path && glyph.path.commands.length > 0) {
                if ((glyph.unicode >= 33) && (glyph.unicode < 0xE000 || glyph.unicode > 0xF8FF)) {
                    glyphs.push(String.fromCharCode(glyph.unicode));
                }
            }
        }
        glyphs.sort();
        setAvailableGlyphs(glyphs);

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Font loading failed:', err);
        setError(message || 'Failed to parse font file. Make sure it is a valid .ttf or .otf file.');
        setFont(null);
        setFontLoaded(false);
        setAvailableGlyphs([]);
      } finally {
        setIsFontLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read font file.');
      setIsFontLoading(false);
    };
    reader.readAsArrayBuffer(fontFile);
  }, []);
  
  const generateSingleGlyph = useCallback((char: string): Promise<GlyphData> => {
    return new Promise((resolve, reject) => {
        if (!font) {
            return reject(new Error('Font not loaded yet.'));
        }
        if (char.length === 0) {
            return reject(new Error('Character cannot be empty.'));
        }

        setIsLoading(true);
        setError(null);

        setTimeout(() => {
            try {
                const charToRender = char[0]; // Always take the first character
                const fontSize = 72;
                const glyphPath = font.getPath(charToRender, 0, 0, fontSize);
                const advanceWidth = font.getAdvanceWidth(charToRender, fontSize);
                
                let shapes: THREE.Shape[] = [];
                if (glyphPath.commands.length > 0) {
                  const path = new THREE.ShapePath();
                  for (const cmd of glyphPath.commands) {
                    switch (cmd.type) {
                      case 'M': path.moveTo(cmd.x, cmd.y); break;
                      case 'L': path.lineTo(cmd.x, cmd.y); break;
                      case 'C': path.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y); break;
                      case 'Q': path.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y); break;
                      case 'Z': if (path.currentPath) path.currentPath.closePath(); break;
                    }
                  }
                  shapes = path.toShapes(true);
                }
                
                if (shapes.length === 0) {
                    throw new Error(`Character "${charToRender}" is not renderable or is a whitespace character.`);
                }

                resolve({ char: charToRender, shapes, advanceWidth });
            } catch (err) {
                const message = err instanceof Error ? err.message : '';
                setError(`Generation failed for '${char}'. ${message}`);
                reject(err);
            } finally {
                setIsLoading(false);
            }
        }, 10);
    });
  }, [font]);

  return { generateSingleGlyph, isLoading, error, fontLoaded, isFontLoading, loadFont, availableGlyphs };
};
