import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, PanResponder, StyleSheet,
} from 'react-native';
import { computeMovement } from '../modules/direction/DirectionCalculator';
import { Movement } from '../types';

interface Props {
  legs?: string[] | null;
  onDrag: (from: string, movement: Movement) => void;
}

const NODE_RADIUS = 28;
const CENTER_RADIUS = 10;
const ARM_THICKNESS = 4;
const SNAP_THRESHOLD = 70;
// Fraction of diagram size from center to node center
const CIRCLE_R = 0.37;

/**
 * Compute each leg's position as (rx, ry) fractions of the diagram square.
 * The anchor leg (i=0) is placed at the bottom (90° in screen coords where y↓),
 * then legs are placed clockwise on screen — which matches the researcher's
 * physical left/right when facing into the intersection.
 */
function computeNodePositions(
  legs: string[],
  anchorIdx: number,
): Record<string, { rx: number; ry: number }> {
  const n = legs.length;
  const result: Record<string, { rx: number; ry: number }> = {};
  for (let i = 0; i < n; i++) {
    const leg = legs[(anchorIdx + i) % n];
    const angleDeg = 90 + (i * 360) / n;
    const angleRad = (angleDeg * Math.PI) / 180;
    result[leg] = {
      rx: 0.5 + CIRCLE_R * Math.cos(angleRad),
      ry: 0.5 + CIRCLE_R * Math.sin(angleRad),
    };
  }
  return result;
}

export default function IntersectionDragMap({ legs, onDrag }: Props) {
  const resolvedLegs = legs && legs.length > 0 ? legs : ['N', 'E', 'S', 'W'];

  const [anchorIdx, setAnchorIdx] = useState(0);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [dragTo, setDragTo] = useState<string | null>(null);
  const [diagramSize, setDiagramSize] = useState(280);

  // Refs keep PanResponder callbacks current (closures capture first-render values)
  const dragFromRef = useRef<string | null>(null);
  const dragToRef = useRef<string | null>(null);
  const anchorIdxRef = useRef(0);
  const resolvedLegsRef = useRef(resolvedLegs);
  const diagramSizeRef = useRef(280);
  const onDragRef = useRef(onDrag);

  anchorIdxRef.current = anchorIdx;
  resolvedLegsRef.current = resolvedLegs;
  diagramSizeRef.current = diagramSize;
  onDragRef.current = onDrag;

  function findNearestLeg(touchX: number, touchY: number): string | null {
    const size = diagramSizeRef.current;
    const positions = computeNodePositions(resolvedLegsRef.current, anchorIdxRef.current);
    let minDist = Infinity;
    let nearest: string | null = null;
    for (const [leg, { rx, ry }] of Object.entries(positions)) {
      const dist = Math.sqrt((touchX - rx * size) ** 2 + (touchY - ry * size) ** 2);
      if (dist < SNAP_THRESHOLD && dist < minDist) {
        minDist = dist;
        nearest = leg;
      }
    }
    return nearest;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const from = findNearestLeg(locationX, locationY);
        dragFromRef.current = from;
        dragToRef.current = null;
        setDragFrom(from);
        setDragTo(null);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const near = findNearestLeg(locationX, locationY);
        const to = near !== null && near !== dragFromRef.current ? near : null;
        dragToRef.current = to;
        setDragTo(to);
      },

      onPanResponderRelease: () => {
        const from = dragFromRef.current;
        const to = dragToRef.current;
        if (from && to) {
          const currentLegs = resolvedLegsRef.current;
          const movement = computeMovement(from, to, currentLegs);
          onDragRef.current(from, movement);
        }
        dragFromRef.current = null;
        dragToRef.current = null;
        setDragFrom(null);
        setDragTo(null);
      },

      onPanResponderTerminate: () => {
        dragFromRef.current = null;
        dragToRef.current = null;
        setDragFrom(null);
        setDragTo(null);
      },
    })
  ).current;

  const nodePositions = computeNodePositions(resolvedLegs, anchorIdx);
  const half = diagramSize * 0.5;

  return (
    <View style={styles.root}>
      {/* Anchor selector */}
      <View style={styles.anchorRow}>
        <Text style={styles.anchorLabel}>STANDING AT</Text>
        <View style={styles.anchorBtns}>
          {resolvedLegs.map((leg, idx) => (
            <TouchableOpacity
              key={leg}
              style={[styles.anchorBtn, anchorIdx === idx && styles.anchorBtnActive]}
              onPress={() => setAnchorIdx(idx)}
            >
              <Text style={[styles.anchorBtnText, anchorIdx === idx && styles.anchorBtnTextActive]}>
                {leg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Diagram wrapper — measures available space */}
      <View
        style={styles.diagramWrapper}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setDiagramSize(Math.min(width, height) * 0.98);
        }}
      >
        <View
          style={[styles.diagram, { width: diagramSize, height: diagramSize }]}
          {...panResponder.panHandlers}
        >
          {/* Arms from center to each node */}
          {Object.entries(nodePositions).map(([leg, { rx, ry }]) => {
            const nx = rx * diagramSize;
            const ny = ry * diagramSize;
            const dx = nx - half;
            const dy = ny - half;
            const armLen = Math.sqrt(dx * dx + dy * dy);
            const armAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            const midX = (half + nx) / 2;
            const midY = (half + ny) / 2;
            const isActive = dragFrom === leg || dragTo === leg;
            return (
              <View
                key={`arm-${leg}`}
                pointerEvents="none"
                style={[
                  styles.arm,
                  {
                    left: midX - armLen / 2,
                    top: midY - ARM_THICKNESS / 2,
                    width: armLen,
                    transform: [{ rotate: `${armAngle}deg` }],
                  },
                  isActive && styles.armActive,
                ]}
              />
            );
          })}

          {/* Center dot */}
          <View
            pointerEvents="none"
            style={[
              styles.centerDot,
              { left: half - CENTER_RADIUS, top: half - CENTER_RADIUS },
            ]}
          />

          {/* Leg nodes */}
          {Object.entries(nodePositions).map(([leg, { rx, ry }]) => {
            const isAnchor = leg === resolvedLegs[anchorIdx];
            const isFrom = dragFrom === leg;
            const isTo = dragTo === leg;
            return (
              <View
                key={`node-${leg}`}
                pointerEvents="none"
                style={[
                  styles.legNode,
                  { left: rx * diagramSize - NODE_RADIUS, top: ry * diagramSize - NODE_RADIUS },
                  isFrom && styles.legNodeFrom,
                  isTo && styles.legNodeTo,
                  !isFrom && !isTo && isAnchor && styles.legNodeAnchor,
                ]}
              >
                <Text style={styles.legLabel} numberOfLines={1}>{leg}</Text>
                {isAnchor && !isFrom && !isTo && (
                  <Text style={styles.youHint}>you</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Contextual hint */}
      <Text style={styles.hint}>
        {dragFrom
          ? `From ${dragFrom} → drag to exit direction`
          : 'Drag from any approach to record a vehicle'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 8 },

  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  anchorLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  anchorBtns: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  anchorBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a3a4a',
    backgroundColor: '#141d27',
  },
  anchorBtnActive: { borderColor: '#4f8ef7', backgroundColor: '#1a2d50' },
  anchorBtnText: { color: '#555', fontSize: 12, fontWeight: 'bold' },
  anchorBtnTextActive: { color: '#4f8ef7' },

  diagramWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagram: {
    position: 'relative',
    backgroundColor: '#0d1117',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e2a3a',
  },

  arm: {
    position: 'absolute',
    height: ARM_THICKNESS,
    backgroundColor: '#1e2a3a',
    borderRadius: 2,
  },
  armActive: { backgroundColor: '#2a3a5a' },

  centerDot: {
    position: 'absolute',
    width: CENTER_RADIUS * 2,
    height: CENTER_RADIUS * 2,
    borderRadius: CENTER_RADIUS,
    backgroundColor: '#2a3a4a',
  },

  legNode: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    borderRadius: NODE_RADIUS,
    backgroundColor: '#1a2535',
    borderWidth: 2,
    borderColor: '#2a3a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legNodeAnchor: { borderColor: '#4f8ef7' },
  legNodeFrom: { backgroundColor: '#7a3a00', borderColor: '#f97316' },
  legNodeTo: { backgroundColor: '#0a3a1a', borderColor: '#22c55e' },

  legLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  youHint: {
    color: '#4f8ef7',
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
  },

  hint: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
  },
});
