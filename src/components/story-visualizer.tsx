
"use client";

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Story } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface StoryVisualizerProps {
  story: Story;
  onNodeClick: (nodeId: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
  id: string;
}

const NODE_WIDTH = 150;
const NODE_HEIGHT = 70;
const H_GAP = 30;
const V_GAP = 50;

export function StoryVisualizer({ story, onNodeClick }: StoryVisualizerProps) {
  const { positions, edges, width, height } = useMemo(() => {
    if (!story || !story.nodes || !story.rootNodeId) return { positions: new Map(), edges: [], width: 0, height: 0 };

    const positions = new Map<string, NodePosition>();
    const edges: { from: NodePosition; to: NodePosition }[] = [];
    
    const hierarchy = new Map<string, string[]>();
    Object.values(story.nodes).forEach(node => {
        const parentId = node.parentId || 'root';
        if (!hierarchy.has(parentId)) hierarchy.set(parentId, []);
        if (node.parentId) hierarchy.get(parentId)!.push(node.id);
    });

    const levelWidths = new Map<number, number>();
    const nodeDepths = new Map<string, number>();

    function calculateWidths(nodeId: string, depth: number) {
        nodeDepths.set(nodeId, depth);
        const children = hierarchy.get(nodeId) || [];
        if (children.length === 0) {
            levelWidths.set(depth, (levelWidths.get(depth) || 0) + 1);
            return 1;
        }
        let width = 0;
        children.forEach(childId => {
            width += calculateWidths(childId, depth + 1);
        });
        return width;
    }

    calculateWidths(story.rootNodeId, 0);
    levelWidths.set(0, 1);


    const maxNodesAtDepth = Math.max(...Array.from(levelWidths.values()));
    const totalWidth = maxNodesAtDepth * (NODE_WIDTH + H_GAP) - H_GAP;

    const levelPositions = new Map<number, number>();

    function positionNodes(nodeId: string | null, depth: number, xOffset: number) {
        if (!nodeId) return;

        const children = hierarchy.get(nodeId) || [];
        const childrenWidth = children.reduce((sum, childId) => sum + (levelWidths.get(nodeDepths.get(childId)!) || 0), 0);
        
        let currentX = xOffset - (childrenWidth * (NODE_WIDTH + H_GAP))/2;

        const y = depth * (NODE_HEIGHT + V_GAP);
        positions.set(nodeId, { id: nodeId, x: xOffset, y });

        children.forEach(childId => {
            const childWidth = levelWidths.get(nodeDepths.get(childId)!) || 1;
            const childXOffset = currentX + (childWidth * (NODE_WIDTH + H_GAP))/2;
            positionNodes(childId, depth + 1, childXOffset);
            currentX += childWidth * (NODE_WIDTH + H_GAP);
        });
    }

    positionNodes(story.rootNodeId, 0, 0);


    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });

    const calculatedWidth = maxX - minX + NODE_WIDTH;
    const calculatedHeight = maxY + NODE_HEIGHT;
    
    const xTranslation = Math.abs(minX) + NODE_WIDTH/2;

    positions.forEach(pos => {
        edges.push(
            ...((hierarchy.get(pos.id) || []).map(childId => ({
                from: pos,
                to: positions.get(childId)!
            })))
        );
    });


    return { positions, edges, width: calculatedWidth, height: calculatedHeight };
  }, [story]);

  if (!story) return null;

  return (
    <ScrollArea className="w-full h-full bg-secondary/30 rounded-lg border">
        <div className="flex items-center justify-center p-4 min-h-full">
            <div className="relative" style={{ width, height }}>
                <svg width={width} height={height} className="absolute top-0 left-0">
                    <defs>
                        <marker
                            id="arrow"
                            viewBox="0 0 10 10"
                            refX="8"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--border))" />
                        </marker>
                    </defs>
                    <g>
                    {edges.map(({ from, to }, i) => (
                        <motion.path
                            key={i}
                            d={`M ${from.x + NODE_WIDTH / 2} ${from.y + NODE_HEIGHT} C ${from.x + NODE_WIDTH / 2} ${from.y + NODE_HEIGHT + V_GAP/2}, ${to.x + NODE_WIDTH / 2} ${to.y - V_GAP/2}, ${to.x + NODE_WIDTH / 2} ${to.y}`}
                            fill="none"
                            stroke="hsl(var(--border))"
                            strokeWidth="2"
                            markerEnd="url(#arrow)"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                        />
                    ))}
                    </g>
                </svg>
                <div className="relative w-full h-full">
                    <AnimatePresence>
                        {Array.from(positions.values()).map((pos, i) => (
                        <motion.div
                            key={pos.id}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05, boxShadow: "0px 5px 15px hsla(var(--foreground) / 0.1)" }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            className="absolute"
                            style={{
                                left: pos.x,
                                top: pos.y,
                                width: NODE_WIDTH,
                                height: NODE_HEIGHT,
                            }}
                        >
                            <button
                                onClick={() => onNodeClick(pos.id)}
                                className={cn(
                                    "w-full h-full p-2 rounded-lg border-2 text-xs transition-all flex items-center justify-center text-center overflow-hidden",
                                    pos.id === story.currentNodeId
                                    ? "bg-primary border-primary text-primary-foreground shadow-lg scale-105"
                                    : "bg-card border-border hover:border-primary"
                                )}
                            >
                                <p className="truncate-3-lines">{story.nodes[pos.id]?.choice || "The Beginning"}</p>
                            </button>
                        </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
