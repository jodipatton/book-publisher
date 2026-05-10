import React from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { SceneDescriptor } from './scene';

// Helper: scene.ts emits left/top as plain percent strings (`"42%"`), which
// RN's strict DimensionValue type narrows to a template literal pattern. We
// cast through the runtime contract here so the composer stays plain TS.
function pct(s: string): DimensionValue {
  return s as DimensionValue;
}

interface Props {
  scene: SceneDescriptor;
  height?: number;
}

export function Scene({ scene, height = 280 }: Props) {
  const { sky, ground, drift, celestial, persona, props, horizon } = scene;
  const horizonPx = (horizon / 100) * height;

  return (
    <View style={[styles.frame, { height }]} pointerEvents="none">
      {/* Sky gradient. */}
      <LinearGradient
        colors={sky}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.sky, { height: horizonPx }]}
      />

      {/* Ground silhouette: layered hills. */}
      <View style={[styles.groundContainer, { top: horizonPx, height: height - horizonPx }]}>
        <View style={[styles.hillsBack, { backgroundColor: shade(ground, -0.12) }]} />
        <View style={[styles.hillsMid, { backgroundColor: shade(ground, -0.05) }]} />
        <View style={[styles.hillsFront, { backgroundColor: ground }]} />
      </View>

      {/* Celestial body. */}
      {celestial ? (
        <Text
          style={[
            styles.absSprite,
            { left: pct(celestial.left), top: pct(celestial.top), fontSize: celestial.size },
          ]}
        >
          {celestial.emoji}
        </Text>
      ) : null}

      {/* Drift sprites (butterflies, fireflies, leaves). */}
      {drift.map((d, i) => (
        <Text
          key={i}
          style={[
            styles.absSprite,
            { left: pct(d.left), top: pct(d.top), fontSize: d.size, opacity: d.opacity },
          ]}
        >
          {d.emoji}
        </Text>
      ))}

      {/* Foreground: persona + scene props sit just above the horizon. */}
      <View style={[styles.fgRow, { top: horizonPx - 60 }]}>
        {props
          .filter((p) => p.offsetX < 0)
          .map((p, i) => (
            <Text key={`pl-${i}`} style={[styles.fgSprite, { fontSize: p.size, marginRight: 8 }]}>
              {p.emoji}
            </Text>
          ))}
        <Text style={[styles.fgSprite, { fontSize: persona.size }]}>{persona.emoji}</Text>
        {props
          .filter((p) => p.offsetX >= 0)
          .map((p, i) => (
            <Text key={`pr-${i}`} style={[styles.fgSprite, { fontSize: p.size, marginLeft: 8 }]}>
              {p.emoji}
            </Text>
          ))}
      </View>
    </View>
  );
}

// Quick darken/lighten helper for layered hill silhouettes.
function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff;
  let g = (n >> 8) & 0xff;
  let b = n & 0xff;
  r = clamp(Math.round(r + 255 * amount));
  g = clamp(Math.round(g + 255 * amount));
  b = clamp(Math.round(b + 255 * amount));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function clamp(v: number) {
  return Math.max(0, Math.min(255, v));
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 14,
  },
  sky: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  groundContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  hillsBack: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: -22,
    height: '120%',
    borderTopLeftRadius: 220,
    borderTopRightRadius: 220,
    transform: [{ scaleX: 1.3 }],
  },
  hillsMid: {
    position: 'absolute',
    left: -20,
    right: -20,
    top: -8,
    height: '120%',
    borderTopLeftRadius: 180,
    borderTopRightRadius: 180,
    transform: [{ scaleX: 1.15 }],
  },
  hillsFront: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    height: '120%',
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
  },
  absSprite: {
    position: 'absolute',
  },
  fgRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  fgSprite: {
    textAlign: 'center',
  },
});
