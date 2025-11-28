"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Loader2, UserPlus, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: 'GESTOR' | 'OPERADOR' | 'RECEPÇÃO';
  user_email: string;
}

const UserManagement = () => {
  const { profile } = useSession();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'OPERADOR' as UserProfile['role'] });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_user_profiles');
    if (error) toast.error(`Erro ao buscar usuários: ${error.message}`);
    else setUsers(data as UserProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile?.role === 'GESTOR') fetchUsers();
  }, [profile, fetchUsers]);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName) {
      toast.error("Nome, e-mail e senha são obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', { body: newUser });
      if (error) throw error;
      toast.success(`Usuário ${newUser.email} criado com sucesso!`);
      setIsAddUserDialogOpen(false);
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'OPERADOR' });
      fetchUsers();
    } catch (error: any) {
      toast.error(`Falha ao criar usuário: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('update-user', {
        body: {
          id: editingUser.id,
          firstName: editingUser.first_name,
          lastName: editingUser.last_name,
          role: editingUser.role,
        },
      });
      if (error) throw error;
      toast.success("Usuário atualizado com sucesso!");
      setIsEditUserDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(`Falha ao atualizar usuário: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', { body: { id: userId } });
      if (error) throw error;
      toast.success("Usuário excluído com sucesso!");
      fetchUsers();
    } catch (error: any) {
      toast.error(`Falha ao excluir usuário: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciamento de Usuários</CardTitle>
            <CardDescription>Crie, edite e gerencie as permissões de acesso dos usuários.</CardDescription>
          </div>
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" /> Criar Usuário</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Novo Usuário</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="firstName">Nome</Label><Input id="firstName" value={newUser.firstName} onChange={(e) => setNewUser(p => ({ ...p, firstName: e.target.value }))} /></div>
                  <div className="space-y-2"><Label htmlFor="lastName">Sobrenome</Label><Input id="lastName" value={newUser.lastName} onChange={(e) => setNewUser(p => ({ ...p, lastName: e.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="role">Permissão</Label><Select value={newUser.role} onValueChange={(v: UserProfile['role']) => setNewUser(p => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPERADOR">Operador</SelectItem><SelectItem value="GESTOR">Gestor</SelectItem><SelectItem value="RECEPÇÃO">Recepção</SelectItem></SelectContent></Select></div>
              </div>
              <DialogFooter><Button onClick={handleCreateUser} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Usuário</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Permissão</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.first_name || ''} {user.last_name || ''}</TableCell>
                  <TableCell>{user.user_email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(user)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                          <AlertDialogTrigger asChild><DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem></AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o usuário e todos os seus dados.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={editingUser.first_name || ''} onChange={(e) => setEditingUser(p => p ? { ...p, first_name: e.target.value } : null)} /></div>
                <div className="space-y-2"><Label>Sobrenome</Label><Input value={editingUser.last_name || ''} onChange={(e) => setEditingUser(p => p ? { ...p, last_name: e.target.value } : null)} /></div>
              </div>
              <div className="space-y-2"><Label>E-mail</Label><Input value={editingUser.user_email} disabled /></div>
              <div className="space-y-2"><Label>Permissão</Label><Select value={editingUser.role} onValueChange={(v: UserProfile['role']) => setEditingUser(p => p ? { ...p, role: v } : null)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OPERADOR">Operador</SelectItem><SelectItem value="GESTOR">Gestor</SelectItem><SelectItem value="RECEPÇÃO">Recepção</SelectItem></SelectContent></Select></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleUpdateUser} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Alterações</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;