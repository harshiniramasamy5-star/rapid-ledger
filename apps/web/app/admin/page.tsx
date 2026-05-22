"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const ROLES = ["admin","creator","approver","decider","performer","auditor"];

const ROLE_COLORS: Record<string, string> = {
  admin:     "bg-red-100 text-red-700 border-red-200",
  creator:   "bg-blue-100 text-blue-700 border-blue-200",
  approver:  "bg-amber-100 text-amber-700 border-amber-200",
  decider:   "bg-purple-100 text-purple-700 border-purple-200",
  performer: "bg-green-100 text-green-700 border-green-200",
  auditor:   "bg-gray-100 text-gray-700 border-gray-200",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]         = useState({
    name: "", email: "", password: "", role: "creator", department: ""
  });

  function token() { return localStorage.getItem("rapid_token"); }

  useEffect(() => {
    const me = JSON.parse(localStorage.getItem("rapid_user") ?? "{}");
    if (me.role !== "admin") { router.replace("/dashboard"); return; }
    loadUsers();
  }, [router]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    if (!form.name || !form.email || !form.password || !form.role) {
      toast.error("All fields are required"); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/admin/users`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      toast.success(`User ${form.name} created successfully`);
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "creator", department: "" });
      loadUsers();
    } catch (err: any) {
      toast.error(err?.error?.message ?? "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUser(userId: string, isActive: boolean) {
    try {
      const res = await fetch(`${API}/admin/users/${userId}/${isActive ? "deactivate" : "activate"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw await res.json();
      toast.success(`User ${isActive ? "deactivated" : "activated"} successfully`);
      loadUsers();
    } catch (err: any) {
      toast.error(err?.error?.message ?? "Failed to update user");
    }
  }

  const activeUsers   = users.filter(u => u.isActive);
  const inactiveUsers = users.filter(u => !u.isActive);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-none">RAPID Ledger</p>
              <p className="text-xs text-slate-400 mt-0.5">Admin Panel · User Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowAdd(true)}>
              + Add User
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <Button variant="ghost" size="sm" className="text-slate-500"
              onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage organizational accounts and role assignments.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users",    value: users.length,        color: "text-primary"     },
            { label: "Active",         value: activeUsers.length,  color: "text-emerald-600" },
            { label: "Inactive",       value: inactiveUsers.length,color: "text-slate-400"   },
            { label: "Roles",          value: ROLES.length,        color: "text-purple-600"  },
          ].map(s => (
            <Card key={s.label} className="border-slate-200 shadow-sm">
              <CardContent className="pt-5 pb-5">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">All Users</CardTitle>
            <CardDescription>
              Manage access, roles and account status for all platform users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Loading users...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100">
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id} className="border-slate-100 hover:bg-slate-50">
                      <TableCell className="font-semibold text-slate-800">{user.name}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{user.email}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border capitalize ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{user.department ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "outline"}
                          className={user.isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "text-slate-400"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(user.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`text-xs font-semibold ${user.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}
                          onClick={() => toggleUser(user.id, user.isActive)}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new organizational account with a role assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-semibold">Full Name</Label>
              <Input placeholder="Alice Johnson" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-semibold">Work Email</Label>
              <Input type="email" placeholder="alice@company.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-semibold">Password</Label>
              <Input type="password" placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-semibold">Role</Label>
              <Select value={form.role} onValueChange={v => setForm((f: any) => ({ ...f, role: v }))}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm font-semibold">
                Department <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <Input placeholder="Engineering, Finance..." value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="border-slate-200" />
            </div>
            <Separator />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={createUser} disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
