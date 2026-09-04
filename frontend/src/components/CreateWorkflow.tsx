import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
} from '@xyflow/react'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  LogOut,
  Save,
  Sparkles,
} from 'lucide-react'
import '@xyflow/react/dist/style.css'

import { ActionSheet } from '@/components/ActionSheet'
import { BrandLogo } from '@/components/BrandLogo'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { NodeConfigSheet } from '@/components/NodeConfigSheet'
import { TriggerSheet } from '@/components/TriggerSheet'
import { workflowNodeTypes } from '@/components/nodes/nodeTypes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/auth/AuthContext'
import { getWorkflow, setWorkflowEnabled, updateWorkflow } from '@/lib/api'
import {
  createSolDipTemplate,
  hydrateWorkflowEdges,
  hydrateWorkflowNodes,
  labelForAction,
  labelForTrigger,
  relabelNode,
  serializeWorkflowEdges,
  serializeWorkflowNodes,
  validateWorkflow,
} from '@/lib/workflowGraph'
import type {
  ActionKind,
  ActionMetadata,
  NodeMetadata,
  TriggerMetadata,
  WorkflowNode,
  WorkflowNodeKind,
} from '@/types/workflow'

export type {
  WorkflowNodeKind,
  WorkflowNodeData,
  WorkflowNode,
} from '@/types/workflow'

const defaultEdgeOptions = {
  style: { strokeWidth: 2 },
  animated: true,
}

function CreateWorkflow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [name, setName] = useState('Untitled workflow')
  const [enabled, setEnabled] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [triggerSheetOpen, setTriggerSheetOpen] = useState(false)
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  )

  const validationErrors = useMemo(
    () => validateWorkflow(nodes, edges),
    [nodes, edges],
  )

  const graphReady = validationErrors.length === 0

  const onNodesChange = useCallback((changes: NodeChange<WorkflowNode>[]) => {
    setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot))
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source)
      const target = nodes.find((node) => node.id === connection.target)
      if (source?.data.type !== 'trigger' || target?.data.type !== 'action') {
        return
      }
      setEdges((edgesSnapshot) => {
        const exists = edgesSnapshot.some(
          (edge) =>
            edge.source === connection.source && edge.target === connection.target,
        )
        if (exists) {
          return edgesSnapshot
        }
        return addEdge(
          { ...connection, animated: true, style: { strokeWidth: 2 } },
          edgesSnapshot,
        )
      })
    },
    [nodes],
  )

  const handleSelectTrigger = useCallback(
    (kind: WorkflowNodeKind, metadata: TriggerMetadata) => {
      const nodeId = `trigger-${kind}-${crypto.randomUUID()}`
      const label = labelForTrigger(kind, metadata)

      setNodes((current) => {
        const triggerCount = current.filter(
          (node) => node.data.type === 'trigger',
        ).length

        const newNode: WorkflowNode = {
          id: nodeId,
          type: 'trigger',
          position: {
            x: 80,
            y: 80 + triggerCount * 120,
          },
          data: {
            type: 'trigger',
            kind,
            metadata,
            label,
          },
        }

        return [...current, newNode]
      })
      setTriggerSheetOpen(false)
    },
    [],
  )

  const handleSelectAction = useCallback(
    (kind: ActionKind, metadata: ActionMetadata) => {
      const nodeId = `action-${kind}-${crypto.randomUUID()}`
      const label = labelForAction(kind, metadata)

      setNodes((current) => {
        const actionCount = current.filter(
          (node) => node.data.type === 'action',
        ).length

        const newNode: WorkflowNode = {
          id: nodeId,
          type: 'action',
          position: {
            x: 440,
            y: 80 + actionCount * 120,
          },
          data: {
            type: 'action',
            kind,
            metadata,
            label,
          },
        }

        return [...current, newNode]
      })
      setActionSheetOpen(false)
    },
    [],
  )

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
      setTriggerSheetOpen(false)
      setActionSheetOpen(false)
    },
    [],
  )

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const handleUpdateNode = useCallback(
    (nodeId: string, metadata: NodeMetadata | undefined) => {
      setNodes((current) =>
        current.map((node) => {
          if (node.id !== nodeId) {
            return node
          }

          return relabelNode({
            ...node,
            data: {
              ...node.data,
              metadata,
            },
          })
        }),
      )
    },
    [],
  )

  const handleLoadTemplate = useCallback(() => {
    if (
      nodes.length > 0 &&
      !window.confirm('Replace the current canvas with the SOL dip template?')
    ) {
      return
    }
    const template = createSolDipTemplate()
    setNodes(template.nodes)
    setEdges(template.edges)
    setSelectedNodeId(null)
    setTriggerSheetOpen(false)
    setActionSheetOpen(false)
    if (name === 'Untitled workflow') {
      setName('SOL dip hedge')
    }
  }, [name, nodes.length])

  useEffect(() => {
    if (!id) {
      return
    }

    let cancelled = false
    setLoadError(null)

    getWorkflow(id)
      .then(({ workflow }) => {
        if (cancelled) {
          return
        }
        setName(workflow.name)
        setEnabled(workflow.enabled)
        const nextNodes = hydrateWorkflowNodes(workflow.nodes)
        setNodes(nextNodes)
        setEdges(
          hydrateWorkflowEdges(
            workflow.edges,
            new Set(nextNodes.map((node) => node.id)),
          ),
        )
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load workflow')
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleSave(): Promise<boolean> {
    if (!id) {
      return false
    }
    setSaveError(null)
    setSaveState('saving')
    const trimmedName = name.trim() || 'Untitled workflow'
    setName(trimmedName)
    try {
      await updateWorkflow(id, {
        name: trimmedName,
        enabled,
        nodes: serializeWorkflowNodes(nodes),
        edges: serializeWorkflowEdges(edges),
      })
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1500)
      return true
    } catch (err) {
      setSaveState('idle')
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      return false
    }
  }

  if (loadError) {
    return (
      <div className="app-grid-bg flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to workflows
        </Button>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Top toolbar */}
      <header className="absolute top-0 right-0 left-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link to="/">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Workflows</span>
            </Link>
          </Button>

          <div className="hidden sm:block">
            <BrandLogo linkTo="/" />
          </div>

          <div className="mx-2 hidden h-6 w-px bg-border sm:block" />

          <Input
            className="h-9 max-w-[200px] border-border/80 bg-card/80"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            aria-label="Workflow name"
          />

          <Badge variant={graphReady ? 'success' : 'warning'} className="hidden md:inline-flex">
            {graphReady ? (
              <>
                <CheckCircle2 className="size-3" />
                Ready
              </>
            ) : (
              <>
                <Circle className="size-3" />
                Incomplete
              </>
            )}
          </Badge>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleLoadTemplate} className="gap-1">
              <Sparkles className="size-3.5" />
              <span className="hidden lg:inline">SOL dip</span>
            </Button>

            <TriggerSheet
              open={triggerSheetOpen}
              onOpenChange={(open) => {
                setTriggerSheetOpen(open)
                if (open) {
                  setSelectedNodeId(null)
                }
              }}
              onSelect={handleSelectTrigger}
            />
            <ActionSheet
              open={actionSheetOpen}
              onOpenChange={(open) => {
                setActionSheetOpen(open)
                if (open) {
                  setSelectedNodeId(null)
                }
              }}
              onSelect={handleSelectAction}
            />

            <Button
              variant={enabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (!id) {
                  return
                }
                const next = !enabled
                if (next) {
                  void (async () => {
                    const saved = await handleSave()
                    if (!saved) {
                      return
                    }
                    setEnabled(true)
                    try {
                      await setWorkflowEnabled(id, true)
                    } catch (err) {
                      setEnabled(false)
                      setSaveError(
                        err instanceof Error ? err.message : 'Could not update enabled',
                      )
                    }
                  })()
                  return
                }
                setEnabled(false)
                void setWorkflowEnabled(id, false).catch((err: unknown) => {
                  setEnabled(true)
                  setSaveError(err instanceof Error ? err.message : 'Could not update enabled')
                })
              }}
            >
              {enabled ? '● Running' : 'Paused'}
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="gap-1"
            >
              <Save className="size-3.5" />
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save'}
            </Button>

            <span className="hidden max-w-[120px] truncate text-xs text-muted-foreground xl:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Left sidebar */}
      <aside className="absolute top-[53px] bottom-0 left-0 z-10 w-80 overflow-y-auto border-r border-border/60 bg-background/60 p-4 backdrop-blur-sm">
        <div className="space-y-3">
          <div className="glass-panel rounded-xl p-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Validation
            </p>
            {saveError ? (
              <p className="mt-2 text-sm text-destructive">{saveError}</p>
            ) : graphReady ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
                <CheckCircle2 className="size-4 shrink-0" />
                Graph is ready to run
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {validationErrors.map((validationError) => (
                  <li
                    key={validationError}
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    · {validationError}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {id ? (
            <ExecutionPanel
              workflowId={id}
              enabled={enabled}
              canRun={graphReady}
              saveGraph={handleSave}
            />
          ) : null}

          <div className="rounded-xl border border-dashed border-border/80 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How to connect</p>
            <p className="mt-1">
              Drag from a trigger&apos;s right handle to an action&apos;s left handle.
              Click a node to edit its settings.
            </p>
          </div>
        </div>
      </aside>

      <NodeConfigSheet
        node={selectedNode}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNodeId(null)
          }
        }}
        onUpdate={handleUpdateNode}
      />

      {/* Canvas */}
      <div className="absolute top-[53px] right-0 bottom-0 left-80">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={workflowNodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
          className="bg-[oklch(0.11_0.02_260)]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="oklch(0.35 0.03 260)"
          />
          <Controls position="bottom-right" />
          <MiniMap
            position="bottom-left"
            className="!bottom-4 !left-4"
            nodeColor={(node) =>
              node.type === 'trigger' ? 'oklch(0.6 0.12 220)' : 'oklch(0.7 0.14 85)'
            }
            maskColor="oklch(0.13 0.02 260 / 80%)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export default CreateWorkflow
