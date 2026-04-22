import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOutputs,
  useListDimensions,
  useCreateOutput,
  useUpdateOutput,
  useDeleteOutput,
  getListOutputsQueryOptions,
  type Output,
  type ErrorType,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FileOutput } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEPARATOR_OPTIONS = [
  { value: "_", label: "Underscore (_)" },
  { value: "-", label: "Hyphen (-)" },
  { value: " ", label: "Space ( )" },
  { value: "__none__", label: "None" },
];

function toStoredSeparator(v: string): string {
  return v === "__none__" ? "" : v;
}

function toDisplaySeparator(v: string): string {
  return v === "" ? "__none__" : v;
}

function getSeparatorLabel(stored: string): string {
  const display = toDisplaySeparator(stored);
  return (SEPARATOR_OPTIONS.find((s) => s.value === display)?.label ?? stored) || "None";
}

interface OutputForm {
  name: string;
  code: string;
  format: string;
  separator: string;
  enabled: boolean;
}

const EMPTY_FORM: OutputForm = { name: "", code: "", format: "", separator: "_", enabled: true };

function toastError(toast: ReturnType<typeof useToast>["toast"], err: ErrorType<unknown>) {
  const data = err.data as Record<string, string> | null;
  const msg = data?.error ?? err.message ?? "Something went wrong";
  toast({ title: "Error", description: msg, variant: "destructive" });
}

export default function Outputs() {
  const { data: outputs = [], isLoading } = useListOutputs();
  const { data: dimensions = [] } = useListDimensions();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editOutput, setEditOutput] = useState<Output | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<OutputForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Output | null>(null);

  const enabledDimensions = dimensions.filter((d) => d.enabled);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListOutputsQueryOptions().queryKey });
  }

  const { mutate: createOutput, isPending: isCreating } = useCreateOutput({
    mutation: {
      onSuccess() {
        invalidate();
        setIsDialogOpen(false);
        toast({ title: "Output created" });
      },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: updateOutput, isPending: isUpdating } = useUpdateOutput({
    mutation: {
      onSuccess() {
        invalidate();
        setIsDialogOpen(false);
        toast({ title: "Output updated" });
      },
      onError(err) { toastError(toast, err); },
    },
  });

  const { mutate: deleteOutput } = useDeleteOutput({
    mutation: {
      onSuccess() {
        invalidate();
        setDeleteTarget(null);
        toast({ title: "Output deleted" });
      },
      onError(err) { toastError(toast, err); },
    },
  });

  function openCreate() {
    setEditOutput(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  }

  function openEdit(output: Output) {
    setEditOutput(output);
    setForm({
      name: output.name,
      code: output.code,
      format: output.format,
      separator: toDisplaySeparator(output.separator),
      enabled: output.enabled,
    });
    setIsDialogOpen(true);
  }

  function handleSave() {
    const payload = { ...form, separator: toStoredSeparator(form.separator) };
    if (editOutput) {
      updateOutput({ id: editOutput.id, data: payload });
    } else {
      createOutput({ data: payload });
    }
  }

  function toggleEnabled(output: Output) {
    updateOutput({ id: output.id, data: { enabled: !output.enabled } });
  }

  function insertToken(code: string) {
    setForm((f) => ({ ...f, format: f.format + `[${code}]` }));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Output Formats</h1>
          <p className="text-muted-foreground mt-1">
            Define naming templates using <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">[DIMENSION_CODE]</code> tokens.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add output
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : outputs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileOutput className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No output formats yet.</p>
            <p className="text-xs mt-1">Create your first naming template above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {outputs.map((output) => (
            <Card key={output.id} className={output.enabled ? "" : "opacity-60"}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={output.enabled}
                    onCheckedChange={() => toggleEnabled(output)}
                    aria-label="Toggle enabled"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{output.name}</span>
                      <Badge variant="outline" className="text-xs font-mono py-0">{output.code}</Badge>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground truncate">{output.format}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Separator: <span className="font-mono">{getSeparatorLabel(output.separator)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(output)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(output)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editOutput ? "Edit output" : "Create output"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Campaign Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  placeholder="CAMPAIGN_NAME"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "_") })}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Format template</Label>
              <Input
                placeholder="[REGION]_[CHANNEL]_[OBJECTIVE]"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="font-mono"
              />
              {enabledDimensions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Available tokens — click to insert:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {enabledDimensions.map((dim) => (
                      <button
                        key={dim.id}
                        type="button"
                        onClick={() => insertToken(dim.code)}
                        className="font-mono text-xs bg-muted hover:bg-secondary border rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                        title={`Insert [${dim.code}]`}
                      >
                        [{dim.code}]
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {enabledDimensions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No enabled dimensions found. Create dimensions first, then use their codes as <code className="bg-muted px-1 rounded">[CODE]</code> tokens.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Separator</Label>
              <Select value={form.separator} onValueChange={(v) => setForm({ ...form, separator: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEPARATOR_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.code || !form.format || isCreating || isUpdating}>
              {isCreating || isUpdating ? "Saving…" : editOutput ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete output</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteOutput({ id: deleteTarget!.id })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
