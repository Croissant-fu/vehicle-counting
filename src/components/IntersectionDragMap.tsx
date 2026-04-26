import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, PanResponder, StyleSheet,
} from 'react-native';
import { computeMovement } from '../modules/direction/DirectionCalculator';
import { Movement } from '../types';

interface Props {
  legs?: string[] | null;
  vehicleTypes: string[];
  onDrag: (from: string, movement: Movement, vehicleType: string) => void;
}

const CENTER_RADIUS = 10;
const ARM_THICKNESS = 4;
const CIRCLE_R = 0.37;
// Each panel is a square whose side = NODE_SIZE_RATIO × diagramSize.
// Max value so panels stay inside bounds: 2 × (0.5 − CIRCLE_R) = 0.26.
// Using 0.25 leaves a small margin.
const NODE_SIZE_RATIO = 0.25;

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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function IntersectionDragMap({ legs, vehicleTypes, onDrag }: Props) {
  const resolvedLegs = legs && legs.length > 0 ? legs : ['N', 'E', 'S', 'W'];

  const [anchorIdx, setAnchorIdx] = useState(0);
  const [dragFrom, setDragFrom] = useState<{ leg: string; vehicleType: string } | null>(null);
  const [dragTo, setDragTo] = useState<string | null>(null);
  const [diagramSize, setDiagramSize] = useState(280);

  const dragFromRef = useRef<{ leg: string; vehicleType: string } | null>(null);
  const dragToRef = useRef<string | null>(null);
  const anchorIdxRef = useRef(0);
  const resolvedLegsRef = useRef(resolvedLegs);
  const diagramSizeRef = useRef(280);
  const onDragRef = useRef(onDrag);
  const vehicleTypesRef = useRef(vehicleTypes);

  anchorIdxRef.current = anchorIdx;
  resolvedLegsRef.current = resolvedLegs;
  diagramSizeRef.current = diagramSize;
  onDragRef.current = onDrag;
  vehicleTypesRef.current = vehicleTypes;

  // Detect which leg panel + which vehicle-type cell was touched.
  // Panels are squares of side `ns` centered at each node position.
  // Vehicle types are arranged in a 2-column grid filling the panel.
  function findDragStart(x: number, y: number): { leg: string; vehicleType: string } | null {
    const size = diagramSizeRef.current;
    const ns = Math.round(size * NODE_SIZE_RATIO);
    const positions = computeNodePositions(resolvedLegsRef.current, anchorIdxRef.current);
    const types = vehicleTypesRef.current;
    if (!types.length) return null;

    for (const [leg, { rx, ry }] of Object.entries(positions)) {
      const cx = rx * size;
      const cy = ry * size;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.abs(dx) <= ns / 2 && Math.abs(dy) <= ns / 2) {
        const nCols = 2;
        const nRows = Math.ceil(types.length / nCols);
        const relX = dx + ns / 2;
        const relY = dy + ns / 2;
        const col = Math.min(nCols - 1, Math.floor(relX / (ns / nCols)));
        const row = Math.min(nRows - 1, Math.floor(relY / (ns / nRows)));
        const idx = Math.min(row * nCols + col, types.length - 1);
        return { leg, vehicleType: types[idx] };
      }
    }
    return null;
  }

  // Detect which leg panel the touch is currently over (for the TO node).
  function findNearestLeg(x: number, y: number): string | null {
    const size = diagramSizeRef.current;
    const ns = Math.round(size * NODE_SIZE_RATIO);
    const positions = computeNodePositions(resolvedLegsRef.current, anchorIdxRef.current);
    for (const [leg, { rx, ry }] of Object.entries(positions)) {
      const cx = rx * size;
      const cy = ry * size;
      if (Math.abs(x - cx) <= ns / 2 && Math.abs(y - cy) <= ns / 2) {
        return leg;
      }
    }
    return null;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const from = findDragStart(locationX, locationY);
        dragFromRef.current = from;
        dragToRef.current = null;
        setDragFrom(from);
        setDragTo(null);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const near = findNearestLeg(locationX, locationY);
        const to = near !== null && near !== dragFromRef.current?.leg ? near : null;
        dragToRef.current = to;
        setDragTo(to);
      },

      onPanResponderRelease: () => {
        const from = dragFromRef.current;
        const to = dragToRef.current;
        if (from && to) {
          const movement = computeMovement(from.leg, to, resolvedLegsRef.current);
          onDragRef.current(from.leg, movement, from.vehicleType);
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
  const nodeSize = Math.round(diagramSize * NODE_SIZE_RATIO);
  const rows = chunk(vehicleTypes, 2);

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

      {/* Diagram */}
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
            const isActive = dragFrom?.leg === leg || dragTo === leg;
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

          {/* Leg node panels */}
          {Object.entries(nodePositions).map(([leg, { rx, ry }]) => {
            const isAnchor = leg === resolvedLegs[anchorIdx];
            const isFrom = dragFrom?.leg === leg;
            const isTo = dragTo === leg;
            return (
              <View
                key={`node-${leg}`}
                pointerEvents="none"
                style={[
                  styles.legNode,
                  {
                    left: rx * diagramSize - nodeSize / 2,
                    top: ry * diagramSize - nodeSize / 2,
                    width: nodeSize,
                    height: nodeSize,
                  },
                  isFrom && styles.legNodeFrom,
                  isTo && styles.legNodeTo,
                  !isFrom && !isTo && isAnchor && styles.legNodeAnchor,
                ]}
              >
                {/* Direction badge — absolute, top-right corner */}
                <View style={[styles.dirBadge, isAnchor && !isFrom && !isTo && styles.dirBadgeAnchor]}>
                  <Text style={[styles.dirBadgeText, isAnchor && !isFrom && !isTo && styles.dirBadgeTextAnchor]}>
                    {leg}{isAnchor ? ' ·' : ''}
                  </Text>
                </View>

                {/* Vehicle-type grid — fills entire panel */}
                <View style={styles.vehicleGrid}>
                  {rows.map((pair, rowIdx) => (
                    <View key={rowIdx} style={styles.vehicleRow}>
                      {pair.map((vt) => {
                        const isActiveBtn = isFrom && dragFrom?.vehicleType === vt;
                        return (
                          <View
                            key={vt}
                            style={[
                              styles.vehicleBtn,
                              isTo && styles.vehicleBtnTo,
                              isActiveBtn && styles.vehicleBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.vehicleBtnText,
                                isTo && styles.vehicleBtnTextTo,
                                isActiveBtn && styles.vehicleBtnTextActive,
                              ]}
                              numberOfLines={2}
                              adjustsFontSizeToFit
                            >
                              {vt}
                            </Text>
                          </View>
                        );
                      })}
                      {/* Spacer when last row has only one item */}
                      {pair.length < 2 && <View style={{ flex: 1 }} />}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Contextual hint */}
      <Text style={styles.hint}>
        {dragFrom
          ? `${dragFrom.leg} · ${dragFrom.vehicleType} — drag to exit direction`
          : 'Swipe a vehicle type in any approach to count it'}
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
    borderRadius: 10,
    backgroundColor: '#152030',
    borderWidth: 2,
    borderColor: '#2a3a4a',
    overflow: 'hidden',
  },
  legNodeAnchor: { borderColor: '#4f8ef7' },
  legNodeFrom: { borderColor: '#f97316', backgroundColor: '#1c1005' },
  legNodeTo: { borderColor: '#22c55e', backgroundColor: '#0a1c10' },

  dirBadge: {
    position: 'absolute',
    top: 4,
    right: 5,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  dirBadgeAnchor: { backgroundColor: 'rgba(20,50,120,0.7)' },
  dirBadgeText: { color: '#99a', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.3 },
  dirBadgeTextAnchor: { color: '#7aadff' },

  vehicleGrid: {
    flex: 1,
    padding: 3,
    gap: 3,
  },
  vehicleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  vehicleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    backgroundColor: '#0e1c2a',
  },
  vehicleBtnActive: { backgroundColor: '#c45800' },
  vehicleBtnTo: { backgroundColor: '#0c2218' },
  vehicleBtnText: {
    color: '#5a7a9a',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vehicleBtnTextActive: { color: '#fff' },
  vehicleBtnTextTo: { color: '#22c55e' },

  hint: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
  },
});
