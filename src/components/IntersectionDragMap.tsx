import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, PanResponder, StyleSheet,
} from 'react-native';
import { computeMovement } from '../modules/direction/DirectionCalculator';
import { Movement } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ThemeTokens } from '../theme';

interface Props {
  legs?: string[] | null;
  vehicleTypes: string[];
  onDrag: (from: string, movement: Movement, vehicleType: string) => void;
  paused?: boolean;
}

const CENTER_RADIUS = 9;
const ARM_THICKNESS = 3;
const CIRCLE_R = 0.32;
const NODE_SIZE_RATIO = 0.36;

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

export default function IntersectionDragMap({ legs, vehicleTypes, onDrag, paused }: Props) {
  const G = useTheme();
  const styles = useMemo(() => createStyles(G), [G]);

  const resolvedLegs = legs && legs.length > 0 ? legs : ['N', 'E', 'S', 'W'];

  const [anchorIdx, setAnchorIdx] = useState(0);
  const [dragFrom, setDragFrom] = useState<{ leg: string; vehicleType: string } | null>(null);
  const [dragTo, setDragTo] = useState<string | null>(null);
  const [diagramSize, setDiagramSize] = useState(280);

  const dragFromRef     = useRef<{ leg: string; vehicleType: string } | null>(null);
  const dragToRef       = useRef<string | null>(null);
  const anchorIdxRef    = useRef(0);
  const resolvedLegsRef = useRef(resolvedLegs);
  const diagramSizeRef  = useRef(280);
  const onDragRef       = useRef(onDrag);
  const vehicleTypesRef = useRef(vehicleTypes);
  const pausedRef       = useRef(false);

  anchorIdxRef.current    = anchorIdx;
  resolvedLegsRef.current = resolvedLegs;
  diagramSizeRef.current  = diagramSize;
  onDragRef.current       = onDrag;
  vehicleTypesRef.current = vehicleTypes;
  pausedRef.current       = paused ?? false;

  function findDragStart(x: number, y: number) {
    const size = diagramSizeRef.current;
    const ns   = Math.round(size * NODE_SIZE_RATIO);
    const positions = computeNodePositions(resolvedLegsRef.current, anchorIdxRef.current);
    const types = vehicleTypesRef.current;
    if (!types.length) return null;
    for (const [leg, { rx, ry }] of Object.entries(positions)) {
      const dx = x - rx * size;
      const dy = y - ry * size;
      if (Math.abs(dx) <= ns / 2 && Math.abs(dy) <= ns / 2) {
        const nCols = 2;
        const nRows = Math.ceil(types.length / nCols);
        const col = Math.min(nCols - 1, Math.floor((dx + ns / 2) / (ns / nCols)));
        const row = Math.min(nRows - 1, Math.floor((dy + ns / 2) / (ns / nRows)));
        return { leg, vehicleType: types[Math.min(row * nCols + col, types.length - 1)] };
      }
    }
    return null;
  }

  function findNearestLeg(x: number, y: number) {
    const size = diagramSizeRef.current;
    const ns   = Math.round(size * NODE_SIZE_RATIO);
    const positions = computeNodePositions(resolvedLegsRef.current, anchorIdxRef.current);
    for (const [leg, { rx, ry }] of Object.entries(positions)) {
      if (Math.abs(x - rx * size) <= ns / 2 && Math.abs(y - ry * size) <= ns / 2) return leg;
    }
    return null;
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (evt) => {
        if (pausedRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const from = findDragStart(locationX, locationY);
        dragFromRef.current = from; dragToRef.current = null;
        setDragFrom(from); setDragTo(null);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const near = findNearestLeg(locationX, locationY);
        const to   = near !== null && near !== dragFromRef.current?.leg ? near : null;
        dragToRef.current = to; setDragTo(to);
      },
      onPanResponderRelease: () => {
        const from = dragFromRef.current;
        const to   = dragToRef.current;
        if (from && to) {
          onDragRef.current(from.leg, computeMovement(from.leg, to, resolvedLegsRef.current), from.vehicleType);
        }
        dragFromRef.current = null; dragToRef.current = null;
        setDragFrom(null); setDragTo(null);
      },
      onPanResponderTerminate: () => {
        dragFromRef.current = null; dragToRef.current = null;
        setDragFrom(null); setDragTo(null);
      },
    })
  ).current;

  const nodePositions = computeNodePositions(resolvedLegs, anchorIdx);
  const half     = diagramSize * 0.5;
  const nodeSize = Math.round(diagramSize * NODE_SIZE_RATIO);
  const rows     = chunk(vehicleTypes, 2);

  return (
    <View style={styles.root}>
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

      <View
        style={styles.diagramWrapper}
        onLayout={(e) => {
          const { width, height: h } = e.nativeEvent.layout;
          setDiagramSize(Math.min(width, h) * 0.98);
        }}
      >
        <View
          style={[styles.diagram, { width: diagramSize, height: diagramSize }]}
          {...panResponder.panHandlers}
        >
          {Object.entries(nodePositions).map(([leg, { rx, ry }]) => {
            const nx = rx * diagramSize;
            const ny = ry * diagramSize;
            const dx = nx - half; const dy = ny - half;
            const armLen   = Math.sqrt(dx * dx + dy * dy);
            const armAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            const isActive = dragFrom?.leg === leg || dragTo === leg;
            return (
              <View
                key={`arm-${leg}`}
                pointerEvents="none"
                style={[
                  styles.arm,
                  {
                    left: (half + nx) / 2 - armLen / 2,
                    top:  (half + ny) / 2 - ARM_THICKNESS / 2,
                    width: armLen,
                    transform: [{ rotate: `${armAngle}deg` }],
                  },
                  isActive && styles.armActive,
                ]}
              />
            );
          })}

          <View
            pointerEvents="none"
            style={[styles.centerDot, { left: half - CENTER_RADIUS, top: half - CENTER_RADIUS }]}
          />

          {Object.entries(nodePositions).map(([leg, { rx, ry }]) => {
            const isAnchor = leg === resolvedLegs[anchorIdx];
            const isFrom   = dragFrom?.leg === leg;
            const isTo     = dragTo === leg;
            return (
              <View
                key={`node-${leg}`}
                pointerEvents="none"
                style={[
                  styles.legNode,
                  { left: rx * diagramSize - nodeSize / 2, top: ry * diagramSize - nodeSize / 2, width: nodeSize, height: nodeSize },
                  isFrom && styles.legNodeFrom,
                  isTo   && styles.legNodeTo,
                  !isFrom && !isTo && isAnchor && styles.legNodeAnchor,
                ]}
              >
                <View style={[styles.dirBadge, isAnchor && !isFrom && !isTo && styles.dirBadgeAnchor]}>
                  <Text style={[styles.dirBadgeText, isAnchor && !isFrom && !isTo && styles.dirBadgeTextAnchor]}>
                    {leg}{isAnchor ? ' ·' : ''}
                  </Text>
                </View>
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
                              isTo        && styles.vehicleBtnTo,
                              isActiveBtn && styles.vehicleBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.vehicleBtnText,
                                isTo        && styles.vehicleBtnTextTo,
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
                      {pair.length < 2 && <View style={{ flex: 1 }} />}
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {paused && (
            <View pointerEvents="none" style={styles.pausedOverlay}>
              <Text style={styles.pausedText}>PAUSED</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.hint}>
        {dragFrom
          ? `${dragFrom.leg} · ${dragFrom.vehicleType} — drag to exit direction`
          : paused
            ? 'Tap ▶ to resume counting'
            : 'Swipe a vehicle type in any approach to count it'}
      </Text>
    </View>
  );
}

function createStyles(G: ThemeTokens) {
  return StyleSheet.create({
    root: { flex: 1, gap: 8 },
    anchorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    anchorLabel: { color: G.textMute, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
    anchorBtns: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
    anchorBtn: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: G.radiusSm, borderWidth: 1, borderColor: G.rim1,
      backgroundColor: G.glass1,
    },
    anchorBtnActive: { borderColor: G.blueRim, backgroundColor: G.blueGlass },
    anchorBtnText: { color: G.textMute, fontSize: 12, fontWeight: '700' },
    anchorBtnTextActive: { color: G.blue },
    diagramWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    diagram: {
      position: 'relative', backgroundColor: G.glass0,
      borderRadius: G.radius, borderWidth: 1, borderColor: G.rim1, overflow: 'hidden',
    },
    arm: { position: 'absolute', height: ARM_THICKNESS, backgroundColor: G.rim0, borderRadius: 2 },
    armActive: { backgroundColor: G.rim2 },
    centerDot: {
      position: 'absolute', width: CENTER_RADIUS * 2, height: CENTER_RADIUS * 2,
      borderRadius: CENTER_RADIUS, backgroundColor: G.glass3, borderWidth: 1, borderColor: G.rim1,
    },
    legNode: {
      position: 'absolute', borderRadius: G.radiusXs,
      backgroundColor: G.glass1, borderWidth: 1.5, borderColor: G.rim1, overflow: 'hidden',
    },
    legNodeAnchor: { borderColor: G.blueRim,  backgroundColor: G.blueGlass },
    legNodeFrom:   { borderColor: G.orangeRim, backgroundColor: G.orangeGlass },
    legNodeTo:     { borderColor: G.greenRim,  backgroundColor: G.greenGlass },
    dirBadge: {
      position: 'absolute', top: 4, right: 4, zIndex: 1,
      backgroundColor: 'rgba(128,128,128,0.25)', borderRadius: 4,
      paddingHorizontal: 4, paddingVertical: 1,
    },
    dirBadgeAnchor: { backgroundColor: G.blueGlass },
    dirBadgeText: { color: G.textMute, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
    dirBadgeTextAnchor: { color: G.blue },
    vehicleGrid: { flex: 1, padding: 2, gap: 2 },
    vehicleRow:  { flex: 1, flexDirection: 'row', gap: 2 },
    vehicleBtn: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      borderRadius: G.radiusXs - 2, backgroundColor: G.glass0,
      borderWidth: 1, borderColor: G.rim0,
    },
    vehicleBtnActive: { backgroundColor: G.orangeGlass, borderColor: G.orangeRim },
    vehicleBtnTo:     { backgroundColor: G.greenGlass,  borderColor: G.greenRim },
    vehicleBtnText:       { color: G.textSub, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    vehicleBtnTextActive: { color: G.orange },
    vehicleBtnTextTo:     { color: G.green },
    pausedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(128,128,128,0.45)',
      justifyContent: 'center', alignItems: 'center',
    },
    pausedText: { color: G.orange, fontSize: 18, fontWeight: '700', letterSpacing: 3 },
    hint: { color: G.textMute, fontSize: 11, textAlign: 'center' },
  });
}
