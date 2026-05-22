import { useRef, useState } from "react";
import {
  useGetMe,
  useListTeamMembers,
  useCreateInvite,
  useRemoveTeamMember,
  customFetch,
  type ErrorType,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Settings2, Users, Link, Copy, Check, UserMinus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

function toastError(toast: ReturnType<typeof useToast>["toast"], err: ErrorType<unknown>) {
  const data = err.data as Record<string, string> | null;
  const msg = data?.error ?? err.message ?? "Something went wrong";
  toast({ title: "Error", description: msg, variant: "destructive" });
}

export default function Settings() {
  const { data: user } = useGetMe();
  const { data: members } = useListTeamMembers();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const { mutate: generateInvite, isPending: isGeneratingInvite } = useCreateInvite({
    mutation: {
      onSuccess(data) {
        setInviteUrl(data.inviteUrl);
        toast({ title: "Invite link generated", description: "Share this link with your teammate." });
      },
      onError(err: ErrorType<unknown>) {
        toastError(toast, err);
      },
    },
  });

  const { mutate: removeMember, isPending: isRemoving } = useRemoveTeamMember({
    mutation: {
      onSuccess() {
        toast({ title: "Member removed", description: "The member has been removed from your team." });
        setConfirmRemoveId(null);
        queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      },
      onError(err: ErrorType<unknown>) {
        toastError(toast, err);
        setConfirmRemoveId(null);
      },
    },
  });

  async function handleCopyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await customFetch<object>("/api/config/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `naming-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Config exported" });
    } catch (err) {
      toastError(toast, err as ErrorType<unknown>);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text) as Record<string, unknown>;
      await customFetch("/api/config/import", {
        method: "POST",
        body: JSON.stringify(json),
      });
      toast({ title: "Config imported", description: "Refresh the page to see changes." });
    } catch (err) {
      toastError(toast, err as ErrorType<unknown>);
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const isOwner = user?.role === "owner";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace configuration.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Team name</span>
              <span className="text-sm font-medium">{user?.teamName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm text-muted-foreground">Your role</span>
              <Badge variant={isOwner ? "default" : "secondary"}>
                {user?.role ?? "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
            <CardDescription>
              {isOwner
                ? "Manage who has access to your workspace."
                : "People with access to this workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y rounded-md border">
              {members && members.length > 0 ? (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{member.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                      {isOwner && member.role !== "owner" && (
                        confirmRemoveId === member.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Remove?</span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-xs"
                              disabled={isRemoving}
                              onClick={() => removeMember({ id: member.id })}
                            >
                              Yes
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              disabled={isRemoving}
                              onClick={() => setConfirmRemoveId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmRemoveId(member.id)}
                          >
                            <UserMinus className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No members found.
                </div>
              )}
            </div>

            {isOwner && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => generateInvite()}
                  disabled={isGeneratingInvite}
                  className="w-full"
                >
                  <Link className="h-4 w-4 mr-2" />
                  {isGeneratingInvite ? "Generating…" : "Generate invite link"}
                </Button>

                {inviteUrl && (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                    <span className="flex-1 text-xs text-muted-foreground truncate">{inviteUrl}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCopyInvite}>
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Invite links are valid for 7 days and can only be used once.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration Backup</CardTitle>
            <CardDescription>
              Export your dimensions and outputs as JSON, or import from a previous backup to replace current config.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleExport} disabled={isExporting} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting…" : "Export config"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={isImporting}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing…" : "Import config"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
