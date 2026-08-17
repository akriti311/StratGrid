import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { ActionSheet } from '@/components/ActionSheet'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { NodeConfigSheet } from '@/components/NodeConfigSheet'
import { TriggerSheet } from '@/components/TriggerSheet'
import { workflowNodeTypes } from '@/components/nodes/nodeTypes'
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
        return addEdge(connection, edgesSnapshot)
      })
    },
    [nodes],
  )

  const handleSelectTrigger = useCallback(
    (kind: WorkflowNodeKind, metadata: TriggerMetadata) => {
      const id = `trigger-${kind}-${crypto.randomUUID()}`
      const label = labelForTrigger(kind, metadata)

      setNodes((current) => {
        const triggerCount = current.filter(
          (node) => node.data.type === 'trigger',
        ).length

        const newNode: WorkflowNode = {
          id,
          type: 'trigger',
          position: {
            x: 80,
            y: 80 + triggerCount * 100,
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
      const id = `action-${kind}-${crypto.randomUUID()}`
      const label = labelForAction(kind, metadata)

      setNodes((current) => {
        const actionCount = current.filter(
          (node) => node.data.type === 'action',
        ).length

        const newNode: WorkflowNode = {
          id,
          type: 'action',
          position: {
            x: 420,
            y: 80 + actionCount * 100,
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to workflows
        </Button>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Input
          className="h-8 w-44"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          aria-label="Workflow name"
        />
        <Button
          variant={enabled ? 'default' : 'outline'}
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
          {enabled ? 'Running' : 'Paused'}
        </Button>
        <Button onClick={handleSave} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save'}
        </Button>
        <p className="hidden max-w-40 truncate text-xs text-muted-foreground sm:block">
          {user?.email}
        </p>
        <Button variant="ghost" onClick={logout}>
          Log out
        </Button>
        <Button variant="outline" onClick={handleLoadTemplate}>
          SOL dip template
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
      </div>

      <div className="absolute top-4 left-4 z-10 max-h-[calc(100vh-2rem)] w-72 max-w-xs space-y-2 overflow-y-auto">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">← Workflows</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/credentials">Credentials</Link>
        </Button>
        <div className="rounded-lg border border-border bg-card/95 px-3 py-2 text-sm shadow-sm">
          {saveError ? (
            <p className="text-destructive">{saveError}</p>
          ) : validationErrors.length === 0 ? (
            <p className="text-foreground">Graph is ready (trigger + action + edge)</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
        {id ? (
          <ExecutionPanel
            workflowId={id}
            enabled={enabled}
            canRun={validationErrors.length === 0}
            saveGraph={handleSave}
          />
        ) : null}
      </div>

      <NodeConfigSheet
        node={selectedNode}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNodeId(null)
          }
        }}
        onUpdate={handleUpdateNode}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={workflowNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

export default CreateWorkflow
