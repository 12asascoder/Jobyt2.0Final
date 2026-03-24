'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReactFlow, Controls, Background, Node, Edge, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RoadmapApi, RoadmapFullData, RoadmapProgressResponse, SkillRecommendationResponse } from '@/lib/api/roadmaps.api';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaCircleCheck, FaStar } from 'react-icons/fa6';
import Link from 'next/link';
import { ROUTES } from '@/constants';
import { useAuthStore } from '@/store/auth.store';

export default function RoadmapGraphPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [data, setData] = useState<RoadmapFullData | null>(null);
  const [progress, setProgress] = useState<RoadmapProgressResponse | null>(null);
  const [recommendation, setRecommendation] = useState<SkillRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    async function load() {
      try {
        const result = await RoadmapApi.getNodes(slug);
        setData(result);
        
        if (user?.id) {
          try {
            const [prog, rec] = await Promise.all([
              RoadmapApi.getProgress(slug, user.id),
              RoadmapApi.getRecommendedNextSkill(slug, user.id)
            ]);
            setProgress(prog);
            setRecommendation(rec);
          } catch (e) {
            console.error('Failed to load user progress', e);
          }
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Failed to load roadmap graph';
        toast.error(msg);
        router.push(ROUTES.roadmaps);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, router, user?.id]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    // Group nodes by hierarchy level (Y position from parser)
    // The parser set positionY to Level * 100, positionX to sortOrder
    const levelMap = new Map<number, typeof data.nodes>();
    data.nodes.forEach(n => {
      const g = levelMap.get(n.position_y) || [];
      g.push(n);
      levelMap.set(n.position_y, g);
    });

    // Compute actual screen X/Y positions
    const NODE_WIDTH = 180;
    const NODE_HEIGHT = 50;
    const GAP_X = 40;
    const GAP_Y = 80;

    const completedSet = new Set(progress?.completedNodes.map(n => n.id) || []);
    const recommendedSet = new Set(recommendation?.recommendedNode ? [recommendation.recommendedNode.id] : []);

    const rfNodes: Node[] = data.nodes.map((n) => {
      const levelNodes = levelMap.get(n.position_y) || [];
      
      // Sort level nodes to assign X reliably
      levelNodes.sort((a, b) => a.position_x - b.position_x);
      
      // Find index within level
      const indexInLevel = levelNodes.findIndex(ln => ln.id === n.id);
      
      // Center the nodes of this level
      const totalWidth = (levelNodes.length * NODE_WIDTH) + ((levelNodes.length - 1) * GAP_X);
      const startX = - (totalWidth / 2) + (NODE_WIDTH / 2);
      
      const screenX = startX + (indexInLevel * (NODE_WIDTH + GAP_X));
      // position_y from DB is exactly level * 100. We can just use it directly or scale it
      const screenY = (n.position_y / 100) * (NODE_HEIGHT + GAP_Y);

      const isCompleted = completedSet.has(n.id);
      const isRecommended = recommendedSet.has(n.id);
      
      let background = n.type === 'root' ? '#0f172a' : n.type === 'category' ? '#e2e8f0' : 'white';
      let color = n.type === 'root' ? 'white' : '#0f172a';
      let border = '1px solid #cbd5e1';

      if (isCompleted) {
        background = '#dcfce7'; // green-100
        border = '2px solid #22c55e'; // green-500
        color = '#166534'; // green-800
      } else if (isRecommended) {
        background = '#fffbeb'; // amber-50
        border = '2px dashed #f59e0b'; // amber-500
        color = '#b45309'; // amber-700
      }

      return {
        id: n.id,
        position: { x: screenX, y: screenY },
        data: { label: isCompleted ? `✓ ${n.title}` : n.title },
        type: n.type === 'root' ? 'input' : 'default',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        style: {
          background,
          color,
          border,
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '12px',
          padding: '10px',
          width: NODE_WIDTH,
          textAlign: 'center',
          boxShadow: isRecommended ? '0 0 15px -3px rgb(245 158 11 / 0.4)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }
      };
    });

    const rfEdges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 }
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [data, progress, recommendation]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full relative">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-slate-200 max-w-sm">
        <Link 
          href={ROUTES.roadmaps}
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 transition-colors"
        >
          <FaArrowLeft className="mr-1.5" /> Back to Roadmaps
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{data.roadmap.title}</h1>
        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{data.roadmap.description}</p>
        <div className="mt-3 flex gap-2 items-center flex-wrap">
          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200">
            {data.nodes.length} Topics
          </span>
          {progress && progress.completionPercentage > 0 && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-green-200 flex items-center gap-1">
              <FaCircleCheck size={10} /> {progress.completionPercentage}% Completed
            </span>
          )}
          <a 
            href={data.roadmap.source_url} 
            target="_blank" 
            rel="noreferrer"
            className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-brand-primary/20 transition-colors"
          >
            Source
          </a>
        </div>
      </div>

      {recommendation?.recommendedNode && (
        <div className="absolute bottom-6 right-6 z-10 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-amber-200 max-w-xs pointer-events-none">
          <div className="flex items-center gap-2 mb-2 text-amber-500">
            <FaStar size={16} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Next Recommended Skill</h3>
          </div>
          <p className="font-bold text-slate-900 text-base leading-tight">{recommendation.recommendedNode.title}</p>
          <p className="text-xs text-slate-500 mt-1 leading-snug">
            {recommendation.reason}
          </p>
        </div>
      )}

      <div className="flex-1 w-full bg-slate-50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls className="bg-white rounded-lg shadow-sm border border-slate-200 fill-slate-600" />
        </ReactFlow>
      </div>
    </div>
  );
}
