import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.js';
import {
  Calendar as CalendarIcon, Check, X, Clock, User, Users, LogOut, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, RefreshCw, Building2, KeyRound, Mail, Phone, DoorOpen,
  CircleDollarSign, Repeat, ShieldCheck, UserCheck, UserX, Ban, Loader2, Plus,
} from 'lucide-react';

/* ============================== THEME ============================== */
const C = {
  bg: '#F6F3EC', surface: '#FFFFFF', surfaceAlt: '#FBF9F4',
  ink: '#22262B', inkMuted: '#767D87', inkFaint: '#A5ABB3',
  primary: '#1E4841', primaryDark: '#153531', primaryLight: '#E7EEEA',
  accent: '#C97B3B', accentLight: '#F3E3D2',
  success: '#2F7D5C', successLight: '#E4F1EA',
  warning: '#B9821F', warningLight: '#FBF0DC',
  danger: '#BF4433', dangerLight: '#FBE7E3',
  border: '#E4DFD3', borderSoft: '#EDE9DE',
};
const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,450;9..144,560;9..144,650&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
.rk-display { font-family: 'Fraunces', Georgia, serif; }
.rk-body { font-family: 'IBM Plex Sans', system-ui, -apple-system, sans-serif; }
.rk-mono { font-family: 'IBM Plex Mono', 'Courier New', monospace; }
.rk-fade { animation: rkFadeIn .28s ease both; }
@keyframes rkFadeIn { from { opacity:0; transform: translateY(4px);} to {opacity:1; transform:none;} }
@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.rk-scroll::-webkit-scrollbar { height:6px; width:6px; }
.rk-scroll::-webkit-scrollbar-thumb { background:${C.border}; border-radius:4px; }
.rk-focus:focus-visible { outline:2px solid ${C.primary}; outline-offset:2px; }
.rk-tag { position:relative; }
.rk-tag::before { content:''; position:absolute; top:-9px; left:50%; transform:translateX(-50%); width:16px; height:16px; border-radius:50%; background:${C.bg}; border:2px solid ${C.border}; box-sizing:border-box; }
.rk-btn { transition: transform .12s ease, box-shadow .12s ease, background-color .12s ease; }
.rk-btn:active { transform: translateY(1px); }
input, select, textarea, button { font-family: inherit; }
`;

/* ============================== SLOT TYPES ============================== */
const SLOT_TYPES = [
  { key: 'meio_manha_1', label: 'Meio Turno Manhã 1', short: 'M.Manhã 1', priceKey: 'half', atoms: ['m1'] },
  { key: 'meio_manha_2', label: 'Meio Turno Manhã 2', short: 'M.Manhã 2', priceKey: 'half', atoms: ['m2'] },
  { key: 'turno_manha', label: 'Turno da Manhã', short: 'Turno Manhã', priceKey: 'shift', atoms: ['m1', 'm2'] },
  { key: 'meio_tarde_1', label: 'Meio Turno Tarde 1', short: 'M.Tarde 1', priceKey: 'half', atoms: ['t1'] },
  { key: 'meio_tarde_2', label: 'Meio Turno Tarde 2', short: 'M.Tarde 2', priceKey: 'half', atoms: ['t2'] },
  { key: 'turno_tarde', label: 'Turno da Tarde', short: 'Turno Tarde', priceKey: 'shift', atoms: ['t1', 't2'] },
  { key: 'turno_noite', label: 'Turno da Noite', short: 'Turno Noite', priceKey: 'shift', atoms: ['n'] },
  { key: 'diaria', label: 'Diária (dia inteiro + noite)', short: 'Diária', priceKey: 'daily', atoms: ['m1', 'm2', 't1', 't2', 'n'] },
];
const SLOT_BY_KEY = Object.fromEntries(SLOT_TYPES.map(s => [s.key, s]));
const WK_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const WK_LABEL = { dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado' };
const WK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/* ============================== DATE UTILS ============================== */
function dstr(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function todayStr() { return dstr(new Date()); }
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return dstr(d); }
function isPast(s) { return s < todayStr(); }
function fmtBR(s) { if (!s) return '—'; const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; }
function fmtMoney(n) { return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function weekdayKey(s) { return WK_KEYS[parseDate(s).getDay()]; }
function fmtDateTime(ts) { if (!ts) return '—'; const d = new Date(ts); return `${dstr(d).split('-').reverse().join('/')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

function slotsOverlap(a, b) {
  const A = SLOT_BY_KEY[a]?.atoms || [], B = SLOT_BY_KEY[b]?.atoms || [];
  return A.some(x => B.includes(x));
}
// availabilityRows: lightweight rows { roomId, date, slotType, status } visible to EVERY logged-in
// user (via the booking_availability view), regardless of who owns the booking.
function getAvailableSlotKeys(room, dateStr, availabilityRows) {
  if (!room || isPast(dateStr)) return [];
  const wk = weekdayKey(dateStr);
  const template = room.availability?.[wk] || {};
  const offered = SLOT_TYPES.filter(st => template[st.key]).map(st => st.key);
  const dayRows = availabilityRows.filter(r => r.roomId === room.id && r.date === dateStr);
  return offered.filter(key => !dayRows.some(r => slotsOverlap(r.slotType, key)));
}
function getOfferedSlotKeys(room, dateStr) {
  const wk = weekdayKey(dateStr);
  const template = room.availability?.[wk] || {};
  return SLOT_TYPES.filter(st => template[st.key]).map(st => st.key);
}

/* ============================== DEFAULT / FALLBACK DATA ============================== */
function defaultHours() {
  return {
    meio_manha_1: { start: '08:00', end: '10:00' }, meio_manha_2: { start: '10:00', end: '12:00' },
    turno_manha: { start: '08:00', end: '12:00' },
    meio_tarde_1: { start: '13:00', end: '15:30' }, meio_tarde_2: { start: '15:30', end: '18:00' },
    turno_tarde: { start: '13:00', end: '18:00' },
    turno_noite: { start: '18:30', end: '22:00' }, diaria: { start: '08:00', end: '22:00' },
  };
}
function deriveFullShifts(hours) {
  return { ...hours, turno_manha: { start: hours.meio_manha_1.start, end: hours.meio_manha_2.end }, turno_tarde: { start: hours.meio_tarde_1.start, end: hours.meio_tarde_2.end } };
}
function timeRangeLabel(hours, slotKey) { const h = hours?.[slotKey]; return h ? `${h.start}–${h.end}` : ''; }
function fullSlotLabel(hours, slotKey) { const st = SLOT_BY_KEY[slotKey]; const range = timeRangeLabel(hours, slotKey); return range ? `${st.label} (${range})` : st.label; }

/* ============================== FINANCE CALC ============================== */
function financeForBookings(list) {
  const today = todayStr();
  let pago = 0, aberto = 0, vencido = 0;
  list.forEach(b => {
    if (b.status !== 'confirmada') return;
    if (b.paymentStatus === 'pago') pago += b.price;
    else if (b.date >= today) aberto += b.price;
    else vencido += b.price;
  });
  return { pago, aberto, vencido };
}
function paymentBadgeStatus(b) {
  if (b.status !== 'confirmada') return null;
  if (b.paymentStatus === 'pago') return 'pago';
  return b.date >= todayStr() ? 'aberto' : 'vencido';
}

/* ============================== DB <-> JS MAPPERS ============================== */
function roomFromDb(r) { return { id: r.id, name: r.name, prices: r.prices, availability: r.availability }; }
function roomToDb(r) { return { id: r.id, name: r.name, prices: r.prices, availability: r.availability }; }
function bookingFromDb(r) {
  return {
    id: r.id, userId: r.user_id, userName: r.user_name, roomId: r.room_id, roomName: r.room_name,
    date: r.date, slotType: r.slot_type, slotLabel: r.slot_label, recurrence: r.recurrence,
    price: Number(r.price), status: r.status, paymentStatus: r.payment_status, paidAt: r.paid_at,
    requestedAt: r.requested_at ? new Date(r.requested_at).getTime() : null,
    confirmedAt: r.confirmed_at ? new Date(r.confirmed_at).getTime() : null,
    groupId: r.group_id, recurrenceEndDate: r.recurrence_end_date,
  };
}
function bookingToDb(b) {
  return {
    id: b.id, user_id: b.userId, user_name: b.userName, room_id: b.roomId, room_name: b.roomName,
    date: b.date, slot_type: b.slotType, slot_label: b.slotLabel, recurrence: b.recurrence,
    price: b.price, status: b.status, payment_status: b.paymentStatus, paid_at: b.paidAt,
    requested_at: b.requestedAt ? new Date(b.requestedAt).toISOString() : new Date().toISOString(),
    confirmed_at: b.confirmedAt ? new Date(b.confirmedAt).toISOString() : null,
    group_id: b.groupId || null, recurrence_end_date: b.recurrenceEndDate || null,
  };
}
function profileFromDb(p) {
  return { id: p.id, email: p.email, name: p.name, cpfCnpj: p.cpf_cnpj, birthDate: p.birth_date, phone: p.phone, role: p.role, status: p.status, createdAt: p.created_at ? new Date(p.created_at).getTime() : null };
}
function availFromDb(r) { return { id: r.id, roomId: r.room_id, date: r.date, slotType: r.slot_type, status: r.status, groupId: r.group_id }; }
function uid() { return crypto.randomUUID(); }

/**
 * Reconciles a weekly recurring ("fixo mensal") booking group against a target end date — generates missing
 * future occurrences, revives previously-cancelled ones that fall back in range, and cancels
 * ones that now fall after the new end date. Works on an in-memory array; the caller is
 * responsible for diffing the result against the DB (see syncBookings).
 */
function reconcileRecurringGroup({ allBookings, room, groupId, startDate, slotType, slotLabel, newEndDate, userId, userName, roomId, roomName, price, requestedAt }) {
  const expected = [];
  let cursor = startDate, guard = 0;
  while (cursor <= newEndDate && guard < 200) { expected.push(cursor); cursor = addDays(cursor, 7); guard++; }

  let updated = [...allBookings];
  let added = 0, revived = 0, cancelled = 0;
  const availabilityLike = () => updated.map(b => ({ roomId: b.roomId, date: b.date, slotType: b.slotType, status: b.status }));

  // The negotiated value is a MONTHLY charge, not a per-occurrence one: only the first weekly
  // occurrence that falls in a given calendar month carries the price, the rest of that month's
  // occurrences are R$0 (they're still real reservations, just already covered by that charge).
  const monthHasCharge = new Set(
    updated.filter(b => b.groupId === groupId && b.status === 'confirmada' && b.price > 0).map(b => b.date.slice(0, 7))
  );

  expected.forEach(date => {
    const monthKey = date.slice(0, 7);
    const existing = updated.find(b => b.groupId === groupId && b.date === date);
    if (existing) {
      if (existing.status !== 'confirmada') {
        const others = availabilityLike().filter((_, i) => updated[i].id !== existing.id);
        const avail = getAvailableSlotKeys(room, date, others);
        if (avail.includes(slotType) || date === startDate) {
          const chargeThis = !monthHasCharge.has(monthKey);
          updated = updated.map(b => b.id === existing.id ? { ...b, status: 'confirmada', recurrenceEndDate: newEndDate, price: chargeThis ? price : 0 } : b);
          revived++;
          if (chargeThis) monthHasCharge.add(monthKey);
        }
      } else {
        // Already confirmed: keep its existing price (don't rewrite history), just sync end date.
        updated = updated.map(b => b.id === existing.id ? { ...b, recurrenceEndDate: newEndDate } : b);
        if (existing.price > 0) monthHasCharge.add(monthKey);
      }
    } else {
      const avail = getAvailableSlotKeys(room, date, availabilityLike());
      if (avail.includes(slotType)) {
        const chargeThis = !monthHasCharge.has(monthKey);
        updated.push({
          id: uid(), userId, userName, roomId, roomName, date, slotType, slotLabel,
          recurrence: 'fixa_mensal', price: chargeThis ? price : 0, status: 'confirmada', paymentStatus: 'pendente', paidAt: null,
          requestedAt, confirmedAt: Date.now(), groupId, recurrenceEndDate: newEndDate,
        });
        added++;
        if (chargeThis) monthHasCharge.add(monthKey);
      }
    }
  });

  updated = updated.map(b => {
    if (b.groupId === groupId && b.status === 'confirmada' && b.date > newEndDate) { cancelled++; return { ...b, status: 'cancelada' }; }
    return b;
  });
  updated = updated.map(b => (b.groupId === groupId ? { ...b, recurrenceEndDate: newEndDate } : b));

  return { updated, added, revived, cancelled };
}

/* ============================== SUPABASE DATA HOOK ============================== */
function useAppData() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [authEvent, setAuthEvent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [shiftHours, setShiftHours] = useState(defaultHours());
  const [bookings, setBookings] = useState([]);
  const [availabilityRows, setAvailabilityRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setAuthEvent(event);
      setSession(sess ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadAll = useCallback(async (silent) => {
    if (!silent) setSyncing(true);
    const [{ data: r }, { data: sh }, { data: bk }, { data: pf }, { data: av }] = await Promise.all([
      supabase.from('rooms').select('*').order('sort_order'),
      supabase.from('shift_hours').select('*').eq('id', 1).maybeSingle(),
      supabase.from('bookings').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('booking_availability').select('*'),
    ]);
    setRooms((r || []).map(roomFromDb));
    setShiftHours(sh?.hours ? deriveFullShifts(sh.hours) : defaultHours());
    setBookings((bk || []).map(bookingFromDb));
    setProfiles((pf || []).map(profileFromDb));
    setAvailabilityRows((av || []).map(availFromDb));
    setSyncing(false);
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setProfile(null); setReady(true); return; }
    (async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      setProfile(p ? profileFromDb(p) : null);
      await loadAll(false);
      setReady(true);
    })();
  }, [session, loadAll]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('app-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => loadAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => loadAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_hours' }, () => loadAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAll(true))
      .subscribe();
    const fallback = setInterval(() => loadAll(true), 60000);
    return () => { supabase.removeChannel(channel); clearInterval(fallback); };
  }, [session, loadAll]);

  // Diff-and-sync helpers: take a full "desired state" array (computed in-memory, same pattern
  // used throughout the UI) and push only the inserts/updates actually needed to Postgres.
  const syncBookings = useCallback(async (updatedArray) => {
    const originalById = new Map(bookings.map(b => [b.id, b]));
    const toInsert = [], toUpdate = [];
    for (const b of updatedArray) {
      const orig = originalById.get(b.id);
      if (!orig) toInsert.push(b);
      else if (JSON.stringify(orig) !== JSON.stringify(b)) toUpdate.push(b);
    }
    setBookings(updatedArray);
    if (toInsert.length) { const { error } = await supabase.from('bookings').insert(toInsert.map(bookingToDb)); if (error) console.error(error); }
    for (const b of toUpdate) { const { id, ...patch } = bookingToDb(b); const { error } = await supabase.from('bookings').update(patch).eq('id', id); if (error) console.error(error); }
    loadAll(true);
  }, [bookings, loadAll]);

  const saveRooms = useCallback(async (updatedArray) => {
    setRooms(updatedArray);
    for (const r of updatedArray) { const { id, ...patch } = roomToDb(r); const { error } = await supabase.from('rooms').update(patch).eq('id', id); if (error) console.error(error); }
    loadAll(true);
  }, [loadAll]);

  const saveShiftHours = useCallback(async (hours) => {
    const merged = deriveFullShifts(hours);
    setShiftHours(merged);
    const { error } = await supabase.from('shift_hours').update({ hours: merged, updated_at: new Date().toISOString() }).eq('id', 1);
    if (error) console.error(error);
    loadAll(true);
  }, [loadAll]);

  const saveProfiles = useCallback(async (updatedArray) => {
    const originalById = new Map(profiles.map(p => [p.id, p]));
    setProfiles(updatedArray);
    for (const p of updatedArray) {
      const orig = originalById.get(p.id);
      if (orig && (orig.status !== p.status || orig.role !== p.role)) {
        const { error } = await supabase.from('profiles').update({ status: p.status, role: p.role }).eq('id', p.id);
        if (error) console.error(error);
      }
    }
    loadAll(true);
  }, [profiles, loadAll]);

  return {
    session, authEvent, profile, profiles, rooms, shiftHours, bookings, availabilityRows,
    ready, syncing, refresh: () => loadAll(false),
    syncBookings, saveRooms, saveShiftHours, saveProfiles,
  };
}

/* ============================== SMALL UI PARTS ============================== */
function Toast({ toast }) {
  if (!toast) return null;
  const colors = { ok: C.success, err: C.danger, info: C.primary };
  return (
    <div className="rk-fade" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: C.ink, color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 8, maxWidth: '90vw' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: colors[toast.type] || C.primary, flexShrink: 0 }} />
      {toast.msg}
    </div>
  );
}
function Badge({ children, tone = 'neutral' }) {
  const map = {
    neutral: { bg: '#EFEBE0', fg: C.inkMuted }, pendente: { bg: C.warningLight, fg: C.warning },
    confirmada: { bg: C.successLight, fg: C.success }, recusada: { bg: C.dangerLight, fg: C.danger },
    cancelada: { bg: '#EFEBE0', fg: C.inkMuted }, pago: { bg: C.successLight, fg: C.success },
    aberto: { bg: C.warningLight, fg: C.warning }, vencido: { bg: C.dangerLight, fg: C.danger },
    ativo: { bg: C.successLight, fg: C.success }, desabilitado: { bg: C.dangerLight, fg: C.danger },
  };
  const s = map[tone] || map.neutral;
  return <span className="rk-body" style={{ background: s.bg, color: s.fg, fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, letterSpacing: '.02em', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{children}</span>;
}
function Btn({ children, onClick, variant = 'primary', icon: Icon, size = 'md', disabled, type = 'button', style }) {
  const sizes = { sm: { padding: '6px 12px', fontSize: 12.5 }, md: { padding: '9px 16px', fontSize: 14 } };
  const variants = {
    primary: { background: C.primary, color: '#fff', border: `1px solid ${C.primary}` },
    ghost: { background: 'transparent', color: C.primary, border: `1px solid ${C.border}` },
    danger: { background: C.dangerLight, color: C.danger, border: `1px solid ${C.dangerLight}` },
    success: { background: C.success, color: '#fff', border: `1px solid ${C.success}` },
    subtle: { background: C.surfaceAlt, color: C.ink, border: `1px solid ${C.border}` },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="rk-btn rk-body rk-focus"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...sizes[size], ...variants[variant], ...style }}>
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}{children}
    </button>
  );
}
function Field({ label, children }) {
  return <label className="rk-body" style={{ display: 'block', marginBottom: 12 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkMuted, marginBottom: 5 }}>{label}</div>{children}</label>;
}
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, fontSize: 14, color: C.ink, boxSizing: 'border-box' };
function Card({ children, style, className }) { return <div className={className} style={{ background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 14, boxShadow: '0 1px 2px rgba(30,72,65,0.04)', ...style }}>{children}</div>; }
function StatCard({ label, value, tone, icon: Icon }) {
  const toneColor = { success: C.success, warning: C.warning, danger: C.danger, primary: C.primary }[tone] || C.ink;
  return (
    <Card style={{ padding: '16px 18px', flex: '1 1 160px', minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="rk-body" style={{ fontSize: 12, fontWeight: 600, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        {Icon && <Icon size={16} color={toneColor} />}
      </div>
      <div className="rk-mono" style={{ fontSize: 22, fontWeight: 600, color: toneColor }}>{value}</div>
    </Card>
  );
}
function RoomTag({ room, selected, onClick, subtitle }) {
  return (
    <button onClick={onClick} className="rk-tag rk-btn rk-focus" style={{ position: 'relative', textAlign: 'left', cursor: 'pointer', padding: '18px 16px 14px', borderRadius: '4px 4px 14px 14px', border: `1.5px solid ${selected ? C.primary : C.border}`, background: selected ? C.primaryLight : C.surface, minWidth: 150, flex: '1 1 150px', boxShadow: selected ? `0 3px 0 ${C.primary}` : '0 1px 0 rgba(0,0,0,0.04)', transform: selected ? 'translateY(-1px)' : 'rotate(-0.4deg)' }}>
      <div className="rk-display" style={{ fontSize: 19, fontWeight: 650, color: selected ? C.primaryDark : C.ink }}>{room.name}</div>
      <div className="rk-body" style={{ fontSize: 12, color: C.inkMuted, marginTop: 3 }}>{subtitle}</div>
    </button>
  );
}
function MiniStat({ label, value, color }) {
  return <div><div className="rk-body" style={{ fontSize: 10.5, fontWeight: 600, color: C.inkFaint, textTransform: 'uppercase', letterSpacing: '.03em' }}>{label}</div><div className="rk-mono" style={{ fontSize: 14, fontWeight: 600, color }}>{value}</div></div>;
}
function InfoRow({ label, value }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid ${C.borderSoft}`, paddingBottom: 8 }}><span className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted }}>{label}</span><span className="rk-body" style={{ fontSize: 13, fontWeight: 600, color: C.ink, textAlign: 'right' }}>{value}</span></div>;
}
function Legend({ color, border, label }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 11, height: 11, borderRadius: 4, background: color, border: `1px solid ${border}` }} /><span className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted }}>{label}</span></div>;
}

/* ============================== CALENDAR ============================== */
function MonthCalendar({ room, availabilityRows, onPickDate, selectedDate }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d; });
  const minMonth = new Date(); minMonth.setDate(1);
  const canGoBack = new Date(year, month, 1) > minMonth;

  return (
    <Card style={{ padding: '16px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button disabled={!canGoBack} onClick={() => setCursor(new Date(year, month - 1, 1))} className="rk-btn rk-focus" style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, width: 28, height: 28, cursor: canGoBack ? 'pointer' : 'not-allowed', opacity: canGoBack ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={15} /></button>
        <span className="rk-display" style={{ fontWeight: 650, fontSize: 16, color: C.ink }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rk-btn rk-focus" style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={15} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {WK_SHORT.map(d => <div key={d} className="rk-body" style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: C.inkFaint, padding: '2px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {days.map((d, i) => {
          const ds = dstr(d);
          const inMonth = d.getMonth() === month;
          const past = isPast(ds);
          const offered = inMonth ? getOfferedSlotKeys(room, ds) : [];
          const available = inMonth && !past ? getAvailableSlotKeys(room, ds, availabilityRows) : [];
          const isFull = offered.length > 0 && available.length === 0;
          const isSelected = ds === selectedDate;
          let bg = 'transparent', fg = C.inkFaint, border = '1px solid transparent', cursor = 'default';
          if (inMonth && !past) {
            if (available.length > 0) { bg = isSelected ? C.primary : C.successLight; fg = isSelected ? '#fff' : C.success; cursor = 'pointer'; border = `1px solid ${isSelected ? C.primary : 'transparent'}`; }
            else if (isFull) { bg = C.dangerLight; fg = C.danger; }
          }
          return (
            <button key={i} disabled={!inMonth || past || available.length === 0} onClick={() => onPickDate(ds)} className="rk-body rk-btn rk-focus"
              style={{ aspectRatio: '1', border, background: bg, color: fg, borderRadius: 8, fontSize: 12.5, fontWeight: isSelected ? 700 : 500, cursor, opacity: inMonth ? 1 : 0.25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d.getDate()}</button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
        <Legend color={C.successLight} border={C.success} label="Disponível" />
        <Legend color={C.dangerLight} border={C.danger} label="Lotado" />
        <Legend color="transparent" border={C.borderSoft} label="Sem oferta" />
      </div>
    </Card>
  );
}

/* ============================== APP SHELL ============================== */
function Shell({ user, onLogout, tabs, active, setActive, children, syncing, onRefresh }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <style>{FONTS}</style>
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.borderSoft}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DoorOpen size={16} color="#fff" /></div>
            <span className="rk-display" style={{ fontSize: 17, fontWeight: 650, color: C.ink }}>Consultório · Salas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onRefresh} title="Atualizar dados" className="rk-btn rk-focus" style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.inkMuted }}>
              {syncing ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
            </button>
            <div className="rk-body" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{user.name || user.email}</div>
              <div style={{ fontSize: 11, color: C.inkMuted }}>{user.role === 'manager' ? 'Gestor' : 'Locatário'}</div>
            </div>
            <button onClick={onLogout} className="rk-btn rk-focus" style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.danger }}><LogOut size={15} /></button>
          </div>
        </div>
        <div className="rk-scroll" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 4, padding: '0 18px', overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)} className="rk-body rk-focus" style={{ padding: '10px 14px', background: 'none', border: 'none', borderBottom: active === t.key ? `2.5px solid ${C.primary}` : '2.5px solid transparent', color: active === t.key ? C.primary : C.inkMuted, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.icon && <t.icon size={15} />}{t.label}
              {t.badge > 0 && <span style={{ background: C.accent, color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '22px 18px 60px' }}>{children}</main>
    </div>
  );
}

/* ============================== AUTH SCREENS ============================== */
function AuthScreen({ data, showToast }) {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reg, setReg] = useState({ name: '', cpfCnpj: '', birthDate: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) showToast(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message, 'err');
  };

  const register = async () => {
    if (!reg.name.trim() || !reg.email.trim() || !reg.password) { showToast('Preencha nome, e-mail e senha.', 'err'); return; }
    if (reg.password !== reg.confirmPassword) { showToast('As senhas não coincidem.', 'err'); return; }
    if (reg.password.length < 6) { showToast('A senha precisa ter pelo menos 6 caracteres.', 'err'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: reg.email.trim(),
      password: reg.password,
      options: { data: { name: reg.name.trim(), cpf_cnpj: reg.cpfCnpj.trim(), birth_date: reg.birthDate || null, phone: reg.phone.trim() } },
    });
    setBusy(false);
    if (error) { showToast(error.message, 'err'); return; }
    showToast('Cadastro criado! Aguarde a aprovação do gestor.', 'ok');
  };

  const forgot = async () => {
    if (!email.trim()) { showToast('Digite seu e-mail primeiro.', 'err'); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    setBusy(false);
    if (error) showToast(error.message, 'err');
    else showToast('Enviamos um link de redefinição de senha para seu e-mail.', 'ok');
  };

  const onEnter = (fn) => (e) => { if (e.key === 'Enter') fn(); };
  const wrap = (title, subtitle, content, footer) => (
    <div className="rk-fade" style={{ width: '100%', maxWidth: 400 }}>
      <Card style={{ padding: '28px 26px' }}>
        <div className="rk-display" style={{ fontSize: 22, fontWeight: 650, color: C.ink, marginBottom: 4 }}>{title}</div>
        <div className="rk-body" style={{ fontSize: 13, color: C.inkMuted, marginBottom: 20 }}>{subtitle}</div>
        {content}{footer}
      </Card>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{FONTS}</style>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DoorOpen size={18} color="#fff" /></div>
          <span className="rk-display" style={{ fontSize: 24, fontWeight: 650, color: C.ink }}>Consultório · Salas</span>
        </div>
        <div className="rk-body" style={{ fontSize: 13.5, color: C.inkMuted }}>Reserva e gestão de salas para sublocação</div>
      </div>

      {mode === 'login' && wrap('Entrar', 'Acesse sua conta.',
        <div>
          <Field label="E-mail"><input autoFocus type="email" className="rk-focus" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onEnter(login)} /></Field>
          <Field label="Senha"><input type="password" className="rk-focus" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onEnter(login)} /></Field>
          <Btn onClick={login} disabled={busy} style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>{busy ? 'Entrando...' : 'Entrar'}</Btn>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12.5, cursor: 'pointer', fontWeight: 600 }} className="rk-body">Primeiro acesso</button>
            <button onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: C.inkMuted, fontSize: 12.5, cursor: 'pointer' }} className="rk-body">Esqueci minha senha</button>
          </div>
        </div>, null
      )}

      {mode === 'forgot' && wrap('Redefinir senha', 'Vamos te enviar um link por e-mail para você criar uma senha nova.',
        <div>
          <Field label="E-mail"><input autoFocus type="email" className="rk-focus" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onEnter(forgot)} /></Field>
          <Btn onClick={forgot} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Enviando...' : 'Enviar link'}</Btn>
        </div>,
        <div style={{ marginTop: 14, textAlign: 'center' }}><button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: C.inkMuted, fontSize: 12.5, cursor: 'pointer' }} className="rk-body">← voltar</button></div>
      )}

      {mode === 'register' && wrap('Primeiro acesso', 'Preencha seus dados para se cadastrar. Seu acesso ficará pendente até o gestor aprovar.',
        <div>
          <Field label="Nome completo"><input autoFocus className="rk-focus" style={inputStyle} value={reg.name} onChange={e => setReg({ ...reg, name: e.target.value })} /></Field>
          <Field label="CPF ou CNPJ"><input className="rk-focus rk-mono" style={inputStyle} value={reg.cpfCnpj} onChange={e => setReg({ ...reg, cpfCnpj: e.target.value })} placeholder="000.000.000-00" /></Field>
          <Field label="Data de nascimento"><input type="date" className="rk-focus rk-mono" style={inputStyle} value={reg.birthDate} onChange={e => setReg({ ...reg, birthDate: e.target.value })} /></Field>
          <Field label="E-mail (será seu login)"><input type="email" className="rk-focus" style={inputStyle} value={reg.email} onChange={e => setReg({ ...reg, email: e.target.value })} /></Field>
          <Field label="Celular / WhatsApp"><input className="rk-focus" style={inputStyle} value={reg.phone} onChange={e => setReg({ ...reg, phone: e.target.value })} placeholder="(00) 00000-0000" /></Field>
          <Field label="Senha (mín. 6 caracteres)"><input type="password" className="rk-focus" style={inputStyle} value={reg.password} onChange={e => setReg({ ...reg, password: e.target.value })} /></Field>
          <Field label="Confirmar senha"><input type="password" className="rk-focus" style={inputStyle} value={reg.confirmPassword} onChange={e => setReg({ ...reg, confirmPassword: e.target.value })} onKeyDown={onEnter(register)} /></Field>
          <Btn onClick={register} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Criando...' : 'Cadastrar'}</Btn>
        </div>,
        <div style={{ marginTop: 14, textAlign: 'center' }}><button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: C.inkMuted, fontSize: 12.5, cursor: 'pointer' }} className="rk-body">← voltar</button></div>
      )}
    </div>
  );
}

function RecoveryScreen({ showToast, onDone }) {
  const [pwd, setPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (pwd.length < 6) { showToast('A senha precisa ter pelo menos 6 caracteres.', 'err'); return; }
    if (pwd !== confirmPwd) { showToast('As senhas não coincidem.', 'err'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { showToast(error.message, 'err'); return; }
    showToast('Senha definida com sucesso!', 'ok');
    onDone();
  };
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{FONTS}</style>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Card style={{ padding: '28px 26px' }}>
          <div className="rk-display" style={{ fontSize: 22, fontWeight: 650, color: C.ink, marginBottom: 4 }}>Defina sua nova senha</div>
          <div className="rk-body" style={{ fontSize: 13, color: C.inkMuted, marginBottom: 20 }}>Você veio de um link de redefinição de senha.</div>
          <Field label="Nova senha"><input autoFocus type="password" className="rk-focus" style={inputStyle} value={pwd} onChange={e => setPwd(e.target.value)} /></Field>
          <Field label="Confirmar nova senha"><input type="password" className="rk-focus" style={inputStyle} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></Field>
          <Btn onClick={save} disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Salvando...' : 'Salvar nova senha'}</Btn>
        </Card>
      </div>
    </div>
  );
}

/* ============================== TENANT: BOOK ROOM ============================== */
function BookTab({ data, profile, showToast }) {
  const rooms = data.rooms || [];
  const [roomId, setRoomId] = useState(rooms[0]?.id);
  const room = rooms.find(r => r.id === roomId) || rooms[0];
  const [selectedDate, setSelectedDate] = useState(null);
  const [slotType, setSlotType] = useState(null);
  const [recurrence, setRecurrence] = useState('avulsa');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setSelectedDate(null); setSlotType(null); }, [roomId]);
  useEffect(() => { if (selectedDate) setRecurrenceEndDate(addDays(selectedDate, 90)); }, [selectedDate]);

  const availableForDate = (room && selectedDate) ? getAvailableSlotKeys(room, selectedDate, data.availabilityRows || []) : [];
  const minEndDate = selectedDate ? addDays(selectedDate, 7) : undefined;
  const maxEndDate = selectedDate ? addDays(selectedDate, 365) : undefined;

  const submit = async () => {
    if (!room || !selectedDate || !slotType) return;
    if (recurrence === 'fixa_mensal' && (!recurrenceEndDate || recurrenceEndDate < minEndDate)) { showToast('Escolha uma data final válida.', 'err'); return; }
    setBusy(true);
    const st = SLOT_BY_KEY[slotType];
    const booking = {
      id: uid(), userId: profile.id, userName: profile.name, roomId: room.id, roomName: room.name,
      date: selectedDate, slotType, slotLabel: fullSlotLabel(data.shiftHours, slotType), recurrence, price: room.prices[st.priceKey],
      status: 'pendente', paymentStatus: 'pendente', paidAt: null, requestedAt: Date.now(), confirmedAt: null, groupId: null,
      recurrenceEndDate: recurrence === 'fixa_mensal' ? recurrenceEndDate : null,
    };
    await data.syncBookings([...(data.bookings || []), booking]);
    setBusy(false); setSelectedDate(null); setSlotType(null); setRecurrence('avulsa'); setRecurrenceEndDate('');
    showToast('Solicitação enviada! Aguarde a confirmação do gestor.', 'ok');
  };

  if (!room) return <div className="rk-body" style={{ color: C.inkMuted }}>Nenhuma sala cadastrada ainda.</div>;

  return (
    <div className="rk-fade" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px, 340px)', gap: 20 }}>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 2 }}>
        {rooms.map(r => <RoomTag key={r.id} room={r} selected={r.id === roomId} onClick={() => setRoomId(r.id)} subtitle={`meio ${fmtMoney(r.prices.half)} · turno ${fmtMoney(r.prices.shift)} · diária ${fmtMoney(r.prices.daily)}`} />)}
      </div>
      <MonthCalendar room={room} availabilityRows={data.availabilityRows || []} selectedDate={selectedDate} onPickDate={(ds) => { setSelectedDate(ds); setSlotType(null); }} />
      <Card style={{ padding: 18 }}>
        <div className="rk-display" style={{ fontSize: 16, fontWeight: 650, marginBottom: 4, color: C.ink }}>{selectedDate ? fmtBR(selectedDate) : 'Selecione uma data'}</div>
        <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, marginBottom: 16 }}>{room.name}</div>
        {!selectedDate && <div className="rk-body" style={{ fontSize: 13, color: C.inkFaint, padding: '20px 0' }}>Clique em um dia disponível no calendário ao lado.</div>}
        {selectedDate && availableForDate.length === 0 && <div className="rk-body" style={{ fontSize: 13, color: C.danger, padding: '12px 0' }}>Sem horários disponíveis para esta data.</div>}
        {selectedDate && availableForDate.length > 0 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="rk-body" style={{ fontSize: 12.5, fontWeight: 600, color: C.inkMuted, marginBottom: 8 }}>Horário</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {availableForDate.map(key => {
                  const st = SLOT_BY_KEY[key]; const price = room.prices[st.priceKey]; const sel = slotType === key;
                  return (
                    <button key={key} onClick={() => setSlotType(key)} className="rk-btn rk-focus" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${sel ? C.primary : C.border}`, background: sel ? C.primaryLight : C.surface, cursor: 'pointer', textAlign: 'left' }}>
                      <span className="rk-body" style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{fullSlotLabel(data.shiftHours, key)}</span>
                      <span className="rk-mono" style={{ fontSize: 13.5, fontWeight: 600, color: C.primaryDark }}>{fmtMoney(price)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div className="rk-body" style={{ fontSize: 12.5, fontWeight: 600, color: C.inkMuted, marginBottom: 8 }}>Recorrência</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: 'avulsa', l: 'Avulsa' }, { v: 'fixa_mensal', l: 'Fixo mensal' }].map(o => (
                  <button key={o.v} onClick={() => setRecurrence(o.v)} className="rk-btn rk-focus" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${recurrence === o.v ? C.primary : C.border}`, background: recurrence === o.v ? C.primaryLight : C.surface, color: recurrence === o.v ? C.primaryDark : C.inkMuted }}>{o.l}</button>
                ))}
              </div>
              {recurrence === 'fixa_mensal' && (
                <div style={{ marginTop: 10 }}>
                  <Field label="Repetir até"><input type="date" className="rk-focus rk-mono" style={inputStyle} value={recurrenceEndDate} min={minEndDate} max={maxEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} /></Field>
                  <div className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted, lineHeight: 1.4, marginTop: -6 }}><Repeat size={11} style={{ display: 'inline', marginRight: 3, position: 'relative', top: -1 }} />O horário se repete toda semana até essa data. O gestor pode alterar depois.</div>
                </div>
              )}
            </div>
            <Btn onClick={submit} disabled={!slotType || busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Enviando...' : 'Solicitar reserva'}</Btn>
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================== TENANT: MY BOOKINGS ============================== */
function MyBookingsTab({ data, profile, showToast }) {
  const mine = (data.bookings || []).filter(b => b.userId === profile.id).sort((a, b) => b.date < a.date ? -1 : 1);
  const cancel = async (id) => { await data.syncBookings((data.bookings || []).map(b => b.id === id ? { ...b, status: 'cancelada' } : b)); showToast('Solicitação cancelada.', 'info'); };
  if (mine.length === 0) return <div className="rk-body rk-fade" style={{ color: C.inkFaint, fontSize: 14, padding: '30px 0' }}>Você ainda não fez nenhuma reserva.</div>;
  return (
    <div className="rk-fade" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {mine.map(b => (
        <Card key={b.id} style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="rk-body" style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{b.roomName} · {b.slotLabel}</div>
            <div className="rk-body" style={{ fontSize: 12, color: C.inkMuted, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="rk-mono">{fmtBR(b.date)}</span>
              {b.recurrence === 'fixa_mensal' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Repeat size={10} />fixo mensal até <span className="rk-mono">{fmtBR(b.recurrenceEndDate)}</span></span>}
              {b.recurrence === 'fixa_mensal' && b.price === 0
                ? <span className="rk-mono" style={{ color: C.inkFaint }}>incluso na mensalidade</span>
                : <span className="rk-mono">{fmtMoney(b.price)}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge tone={b.status}>{b.status}</Badge>
            {paymentBadgeStatus(b) && <Badge tone={paymentBadgeStatus(b)}>{paymentBadgeStatus(b)}</Badge>}
            {b.status === 'pendente' && <Btn size="sm" variant="danger" icon={X} onClick={() => cancel(b.id)}>Cancelar</Btn>}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================== TENANT: MY FINANCE ============================== */
function MyFinanceTab({ data, profile }) {
  const mine = (data.bookings || []).filter(b => b.userId === profile.id);
  const fin = financeForBookings(mine);
  const pending = mine.filter(b => b.status === 'confirmada' && b.paymentStatus !== 'pago' && b.price > 0).sort((a, b) => a.date < b.date ? -1 : 1);
  return (
    <div className="rk-fade">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Pago" value={fmtMoney(fin.pago)} tone="success" icon={CheckCircle2} />
        <StatCard label="Em aberto" value={fmtMoney(fin.aberto)} tone="warning" icon={Clock} />
        <StatCard label="Vencido" value={fmtMoney(fin.vencido)} tone="danger" icon={AlertCircle} />
      </div>
      <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, marginBottom: 14, lineHeight: 1.5 }}>Os pagamentos são combinados diretamente com o gestor (link de pagamento ou Pix). O status é atualizado por ele após o recebimento.</div>
      {pending.length === 0 ? <div className="rk-body" style={{ color: C.inkFaint, fontSize: 13.5 }}>Nenhum pagamento pendente. 🎉</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pending.map(b => (
            <Card key={b.id} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div className="rk-body" style={{ fontSize: 13.5, color: C.ink }}>{b.roomName} · {b.slotLabel} <span className="rk-mono" style={{ color: C.inkMuted }}>({fmtBR(b.date)})</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="rk-mono" style={{ fontWeight: 600, color: C.ink }}>{fmtMoney(b.price)}</span><Badge tone={paymentBadgeStatus(b)}>{paymentBadgeStatus(b)}</Badge></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== MY ACCOUNT (both roles) ============================== */
function MyAccountTab({ profile, showToast }) {
  const [pwd, setPwd] = useState(''); const [confirmPwd, setConfirmPwd] = useState(''); const [busy, setBusy] = useState(false);
  const changePassword = async () => {
    if (pwd.length < 6) { showToast('A senha precisa ter pelo menos 6 caracteres.', 'err'); return; }
    if (pwd !== confirmPwd) { showToast('As senhas não coincidem.', 'err'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { showToast(error.message, 'err'); return; }
    setPwd(''); setConfirmPwd(''); showToast('Senha atualizada com sucesso.', 'ok');
  };
  return (
    <div className="rk-fade" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 460 }}>
      <Card style={{ padding: 20 }}>
        <div className="rk-display" style={{ fontSize: 16, fontWeight: 650, marginBottom: 14, color: C.ink }}>Meus dados</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <InfoRow label="Nome" value={profile.name} /><InfoRow label="E-mail (login)" value={profile.email} />
          <InfoRow label="CPF/CNPJ" value={profile.cpfCnpj || '—'} /><InfoRow label="Data de nascimento" value={profile.birthDate ? fmtBR(profile.birthDate) : '—'} />
          <InfoRow label="Celular / WhatsApp" value={profile.phone || '—'} />
        </div>
        <div className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted, marginTop: 12 }}>Para corrigir algum desses dados, fale com o gestor.</div>
      </Card>
      <Card style={{ padding: 20 }}>
        <div className="rk-display" style={{ fontSize: 16, fontWeight: 650, marginBottom: 14, color: C.ink }}>Alterar senha</div>
        <Field label="Nova senha"><input type="password" className="rk-focus" style={inputStyle} value={pwd} onChange={e => setPwd(e.target.value)} /></Field>
        <Field label="Confirmar nova senha"><input type="password" className="rk-focus" style={inputStyle} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} /></Field>
        <Btn onClick={changePassword} disabled={busy}>{busy ? 'Salvando...' : 'Salvar nova senha'}</Btn>
      </Card>
    </div>
  );
}

/* ============================== MANAGER: NEW BOOKING ============================== */
function ManagerBookTab({ data, profile, showToast }) {
  const rooms = data.rooms || [];
  const activeUsers = (data.profiles || []).filter(u => u.role === 'tenant' && u.status === 'ativo');
  const [forWhom, setForWhom] = useState('self');
  const [roomId, setRoomId] = useState(rooms[0]?.id);
  const room = rooms.find(r => r.id === roomId) || rooms[0];
  const [selectedDate, setSelectedDate] = useState(null);
  const [slotType, setSlotType] = useState(null);
  const [price, setPrice] = useState('');
  const [recurrence, setRecurrence] = useState('avulsa');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setSelectedDate(null); setSlotType(null); }, [roomId]);
  useEffect(() => { if (selectedDate) setRecurrenceEndDate(addDays(selectedDate, 90)); }, [selectedDate]);
  useEffect(() => { if (room && slotType) setPrice(String(room.prices[SLOT_BY_KEY[slotType].priceKey])); }, [slotType, roomId]);

  const availableForDate = (room && selectedDate) ? getAvailableSlotKeys(room, selectedDate, data.availabilityRows || []) : [];
  const minEndDate = selectedDate ? addDays(selectedDate, 7) : undefined;
  const maxEndDate = selectedDate ? addDays(selectedDate, 365) : undefined;
  const targetUser = forWhom === 'self' ? profile : activeUsers.find(u => u.id === forWhom);

  const submit = async () => {
    if (!room || !selectedDate || !slotType || !targetUser) return;
    if (recurrence === 'fixa_mensal' && (!recurrenceEndDate || recurrenceEndDate < minEndDate)) { showToast('Escolha uma data final válida.', 'err'); return; }
    setBusy(true);
    const finalPrice = Number(price) || 0;
    const now = Date.now();
    const baseBooking = {
      id: uid(), userId: targetUser.id, userName: targetUser.name, roomId: room.id, roomName: room.name,
      date: selectedDate, slotType, slotLabel: fullSlotLabel(data.shiftHours, slotType), recurrence, price: finalPrice,
      status: 'confirmada', paymentStatus: 'pendente', paidAt: null, requestedAt: now, confirmedAt: now,
      groupId: recurrence === 'fixa_mensal' ? undefined : null, recurrenceEndDate: recurrence === 'fixa_mensal' ? recurrenceEndDate : null,
    };
    if (recurrence === 'fixa_mensal') baseBooking.groupId = baseBooking.id;
    let updated = [...(data.bookings || []), baseBooking];
    let addedCount = 0;
    if (recurrence === 'fixa_mensal') {
      const { updated: reconciled, added } = reconcileRecurringGroup({
        allBookings: updated, room, groupId: baseBooking.id, startDate: baseBooking.date, slotType, slotLabel: baseBooking.slotLabel,
        newEndDate: recurrenceEndDate, userId: targetUser.id, userName: targetUser.name, roomId: room.id, roomName: room.name, price: finalPrice, requestedAt: now,
      });
      updated = reconciled; addedCount = added;
    }
    await data.syncBookings(updated);
    setBusy(false); setSelectedDate(null); setSlotType(null); setRecurrence('avulsa'); setRecurrenceEndDate('');
    showToast(`Reserva criada e confirmada para ${targetUser.name}${addedCount ? ` (+ ${addedCount} ocorrências futuras)` : ''}.`, 'ok');
  };

  if (!room) return <div className="rk-body" style={{ color: C.inkMuted }}>Nenhuma sala cadastrada ainda.</div>;

  return (
    <div className="rk-fade" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px, 340px)', gap: 20 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <div className="rk-body" style={{ fontSize: 12.5, fontWeight: 600, color: C.inkMuted, marginBottom: 8 }}>Reservar para</div>
        <select className="rk-focus rk-body" style={{ ...inputStyle, maxWidth: 320 }} value={forWhom} onChange={e => setForWhom(e.target.value)}>
          <option value="self">Eu mesmo ({profile.name})</option>
          {activeUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {activeUsers.length === 0 && <div className="rk-body" style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 6 }}>Nenhum locatário habilitado ainda.</div>}
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 2 }}>
        {rooms.map(r => <RoomTag key={r.id} room={r} selected={r.id === roomId} onClick={() => setRoomId(r.id)} subtitle={`meio ${fmtMoney(r.prices.half)} · turno ${fmtMoney(r.prices.shift)} · diária ${fmtMoney(r.prices.daily)}`} />)}
      </div>
      <MonthCalendar room={room} availabilityRows={data.availabilityRows || []} selectedDate={selectedDate} onPickDate={(ds) => { setSelectedDate(ds); setSlotType(null); }} />
      <Card style={{ padding: 18 }}>
        <div className="rk-display" style={{ fontSize: 16, fontWeight: 650, marginBottom: 4, color: C.ink }}>{selectedDate ? fmtBR(selectedDate) : 'Selecione uma data'}</div>
        <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, marginBottom: 16 }}>{room.name}</div>
        {!selectedDate && <div className="rk-body" style={{ fontSize: 13, color: C.inkFaint, padding: '20px 0' }}>Clique em um dia disponível no calendário ao lado.</div>}
        {selectedDate && availableForDate.length === 0 && <div className="rk-body" style={{ fontSize: 13, color: C.danger, padding: '12px 0' }}>Sem horários disponíveis para esta data.</div>}
        {selectedDate && availableForDate.length > 0 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div className="rk-body" style={{ fontSize: 12.5, fontWeight: 600, color: C.inkMuted, marginBottom: 8 }}>Horário</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {availableForDate.map(key => {
                  const st = SLOT_BY_KEY[key]; const listPrice = room.prices[st.priceKey]; const sel = slotType === key;
                  return (
                    <button key={key} onClick={() => setSlotType(key)} className="rk-btn rk-focus" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${sel ? C.primary : C.border}`, background: sel ? C.primaryLight : C.surface, cursor: 'pointer', textAlign: 'left' }}>
                      <span className="rk-body" style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{fullSlotLabel(data.shiftHours, key)}</span>
                      <span className="rk-mono" style={{ fontSize: 13.5, fontWeight: 600, color: C.primaryDark }}>{fmtMoney(listPrice)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {slotType && <Field label={recurrence === 'fixa_mensal' ? 'Valor mensal (editável)' : 'Preço desta reserva (editável)'}><div style={{ position: 'relative' }}><span className="rk-mono" style={{ position: 'absolute', left: 11, top: 9, fontSize: 13, color: C.inkFaint }}>R$</span><input type="number" min="0" className="rk-focus rk-mono" style={{ ...inputStyle, paddingLeft: 34 }} value={price} onChange={e => setPrice(e.target.value)} /></div></Field>}
            <div style={{ marginBottom: 18 }}>
              <div className="rk-body" style={{ fontSize: 12.5, fontWeight: 600, color: C.inkMuted, marginBottom: 8 }}>Recorrência</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: 'avulsa', l: 'Avulsa' }, { v: 'fixa_mensal', l: 'Fixo mensal' }].map(o => (
                  <button key={o.v} onClick={() => setRecurrence(o.v)} className="rk-btn rk-focus" style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${recurrence === o.v ? C.primary : C.border}`, background: recurrence === o.v ? C.primaryLight : C.surface, color: recurrence === o.v ? C.primaryDark : C.inkMuted }}>{o.l}</button>
                ))}
              </div>
              {recurrence === 'fixa_mensal' && <div style={{ marginTop: 10 }}><Field label="Repetir até"><input type="date" className="rk-focus rk-mono" style={inputStyle} value={recurrenceEndDate} min={minEndDate} max={maxEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} /></Field></div>}
            </div>
            <Btn onClick={submit} disabled={!slotType || busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Criando...' : 'Criar reserva confirmada'}</Btn>
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================== MANAGER: REQUESTS ============================== */
function RequestsTab({ data, showToast }) {
  const pending = (data.bookings || []).filter(b => b.status === 'pendente').sort((a, b) => a.requestedAt - b.requestedAt);
  const [negPrices, setNegPrices] = useState({});
  const priceFor = (b) => (negPrices[b.id] !== undefined ? negPrices[b.id] : b.price);

  const confirm = async (booking) => {
    const finalPrice = Number(priceFor(booking)) || 0;
    let updated = (data.bookings || []).map(b => b.id === booking.id ? { ...b, status: 'confirmada', confirmedAt: Date.now(), price: finalPrice, groupId: booking.recurrence === 'fixa_mensal' ? booking.id : null } : b);
    if (booking.recurrence === 'fixa_mensal') {
      const room = (data.rooms || []).find(r => r.id === booking.roomId);
      const endDate = booking.recurrenceEndDate || addDays(booking.date, 90);
      const { updated: reconciled, added } = reconcileRecurringGroup({ allBookings: updated, room, groupId: booking.id, startDate: booking.date, slotType: booking.slotType, slotLabel: booking.slotLabel, newEndDate: endDate, userId: booking.userId, userName: booking.userName, roomId: booking.roomId, roomName: booking.roomName, price: finalPrice, requestedAt: booking.requestedAt });
      updated = reconciled;
      showToast(`Reserva confirmada a ${fmtMoney(finalPrice)}/mês + ${added} ocorrências geradas até ${fmtBR(endDate)}.`, 'ok');
    } else showToast('Reserva confirmada.', 'ok');
    await data.syncBookings(updated);
  };
  const reject = async (id) => { await data.syncBookings((data.bookings || []).map(b => b.id === id ? { ...b, status: 'recusada' } : b)); showToast('Solicitação recusada.', 'info'); };

  if (pending.length === 0) return <div className="rk-body rk-fade" style={{ color: C.inkFaint, fontSize: 14, padding: '30px 0' }}>Nenhuma solicitação pendente no momento.</div>;
  return (
    <div className="rk-fade" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {pending.map(b => (
        <Card key={b.id} style={{ padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div className="rk-body" style={{ fontSize: 14.5, fontWeight: 650, color: C.ink }}>{b.userName}</div>
            <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>{b.roomName} · {b.slotLabel}</span><span className="rk-mono">{fmtBR(b.date)}</span>
              {b.recurrence === 'fixa_mensal' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Repeat size={10} />fixo mensal até <span className="rk-mono">{fmtBR(b.recurrenceEndDate)}</span></span>}
              {b.recurrence !== 'fixa_mensal' && <span className="rk-mono" style={{ fontWeight: 600 }}>{fmtMoney(b.price)}</span>}
            </div>
            <div className="rk-body" style={{ fontSize: 11, color: C.inkFaint, marginTop: 3 }}>solicitado em {fmtDateTime(b.requestedAt)}</div>
            {b.recurrence === 'fixa_mensal' && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted }}>Valor negociado (mensal):</span>
                <div style={{ position: 'relative' }}><span className="rk-mono" style={{ position: 'absolute', left: 9, top: 6, fontSize: 12, color: C.inkFaint }}>R$</span><input type="number" min="0" className="rk-focus rk-mono" style={{ ...inputStyle, width: 110, padding: '5px 8px 5px 30px', fontSize: 12.5 }} value={priceFor(b)} onChange={e => setNegPrices({ ...negPrices, [b.id]: e.target.value })} /></div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}><Btn size="sm" variant="success" icon={Check} onClick={() => confirm(b)}>Confirmar</Btn><Btn size="sm" variant="danger" icon={X} onClick={() => reject(b.id)}>Recusar</Btn></div>
        </Card>
      ))}
    </div>
  );
}

/* ============================== MANAGER: USERS ============================== */
function UsersTab({ data, showToast }) {
  const users = (data.profiles || []).filter(u => u.role === 'tenant');
  const [expanded, setExpanded] = useState(null);

  const setStatus = async (id, status) => { await data.saveProfiles(users.map(u => u.id === id ? { ...u, status } : u)); showToast(status === 'ativo' ? 'Usuário habilitado.' : 'Usuário desabilitado.', 'ok'); };
  const sendReset = async (u) => {
    const { error } = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: window.location.origin });
    if (error) showToast(error.message, 'err');
    else showToast(`Link de redefinição enviado para o e-mail de ${u.name}.`, 'ok');
  };

  if (users.length === 0) return <div className="rk-body rk-fade" style={{ color: C.inkFaint, fontSize: 14, padding: '30px 0' }}>Nenhum locatário cadastrado ainda.</div>;
  return (
    <div className="rk-fade" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {users.map(u => {
        const bookings = (data.bookings || []).filter(b => b.userId === u.id);
        const fin = financeForBookings(bookings);
        const isOpen = expanded === u.id;
        return (
          <Card key={u.id} style={{ padding: '15px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="rk-body" style={{ fontSize: 14.5, fontWeight: 650, color: C.ink }}>{u.name}</span><Badge tone={u.status === 'ativo' ? 'ativo' : u.status === 'desabilitado' ? 'desabilitado' : 'pendente'}>{u.status}</Badge></div>
                <div className="rk-body" style={{ fontSize: 12, color: C.inkMuted, marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{u.email}</span>
                  {u.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{u.phone}</span>}
                  {u.cpfCnpj && <span className="rk-mono">CPF/CNPJ: {u.cpfCnpj}</span>}
                  {u.birthDate && <span className="rk-mono">nasc. {fmtBR(u.birthDate)}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {u.status !== 'ativo' && <Btn size="sm" variant="success" icon={UserCheck} onClick={() => setStatus(u.id, 'ativo')}>Habilitar</Btn>}
                {u.status === 'ativo' && <Btn size="sm" variant="danger" icon={UserX} onClick={() => setStatus(u.id, 'desabilitado')}>Desabilitar</Btn>}
                <Btn size="sm" variant="subtle" icon={KeyRound} onClick={() => sendReset(u)}>Enviar link de nova senha</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : u.id)}>{isOpen ? 'Ocultar' : 'Detalhes'}</Btn>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
              <MiniStat label="Pago" value={fmtMoney(fin.pago)} color={C.success} /><MiniStat label="Em aberto" value={fmtMoney(fin.aberto)} color={C.warning} /><MiniStat label="Vencido" value={fmtMoney(fin.vencido)} color={C.danger} />
            </div>
            {isOpen && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.borderSoft}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bookings.length === 0 && <div className="rk-body" style={{ fontSize: 12.5, color: C.inkFaint }}>Sem reservas.</div>}
                {bookings.sort((a, b) => b.date < a.date ? -1 : 1).map(b => (
                  <div key={b.id} className="rk-body" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.inkMuted, padding: '4px 0' }}>
                    <span>{b.roomName} · {b.slotLabel} · <span className="rk-mono">{fmtBR(b.date)}</span></span>
                    <span style={{ display: 'flex', gap: 6 }}><Badge tone={b.status}>{b.status}</Badge>{paymentBadgeStatus(b) && <Badge tone={paymentBadgeStatus(b)}>{paymentBadgeStatus(b)}</Badge>}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ============================== MANAGER: SHIFT HOURS (GLOBAL) ============================== */
function ShiftHoursTab({ data, showToast }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(data.shiftHours || defaultHours())));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDraft(JSON.parse(JSON.stringify(data.shiftHours || defaultHours()))); }, [data.shiftHours]);
  const update = (slotKey, edge, value) => { setDraft(deriveFullShifts({ ...draft, [slotKey]: { ...draft[slotKey], [edge]: value } })); setDirty(true); };
  const save = async () => { await data.saveShiftHours(draft); setDirty(false); showToast('Horários dos turnos atualizados para todas as salas.', 'ok'); };

  return (
    <div className="rk-fade">
      <Card style={{ padding: 20, maxWidth: 780 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
          <div className="rk-display" style={{ fontSize: 18, fontWeight: 650, color: C.ink }}>Horários dos turnos</div>
          {dirty && <Btn size="sm" onClick={save}>Salvar alterações</Btn>}
        </div>
        <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, marginBottom: 20, lineHeight: 1.5 }}>Estes horários valem para as 3 salas — configure uma única vez aqui.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
          {[{ title: 'Manhã', halves: ['meio_manha_1', 'meio_manha_2'], full: 'turno_manha' }, { title: 'Tarde', halves: ['meio_tarde_1', 'meio_tarde_2'], full: 'turno_tarde' }].map(group => (
            <div key={group.title} style={{ border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: '12px 14px' }}>
              <div className="rk-display" style={{ fontSize: 13.5, fontWeight: 650, color: C.ink, marginBottom: 10 }}>{group.title}</div>
              {group.halves.map(hk => (
                <div key={hk} style={{ marginBottom: 8 }}>
                  <div className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted, marginBottom: 4 }}>{SLOT_BY_KEY[hk].label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="time" className="rk-focus rk-mono" style={{ ...inputStyle, padding: '6px 8px' }} value={draft[hk].start} onChange={e => update(hk, 'start', e.target.value)} />
                    <span className="rk-body" style={{ color: C.inkFaint, fontSize: 11.5 }}>até</span>
                    <input type="time" className="rk-focus rk-mono" style={{ ...inputStyle, padding: '6px 8px' }} value={draft[hk].end} onChange={e => update(hk, 'end', e.target.value)} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.borderSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted }}>{SLOT_BY_KEY[group.full].label} <span style={{ color: C.inkFaint }}>(auto)</span></span>
                <span className="rk-mono" style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{timeRangeLabel(draft, group.full)}</span>
              </div>
            </div>
          ))}
          <div style={{ border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: '12px 14px' }}>
            <div className="rk-display" style={{ fontSize: 13.5, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Noite</div>
            <div className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted, marginBottom: 4 }}>{SLOT_BY_KEY.turno_noite.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="time" className="rk-focus rk-mono" style={{ ...inputStyle, padding: '6px 8px' }} value={draft.turno_noite.start} onChange={e => update('turno_noite', 'start', e.target.value)} />
              <span className="rk-body" style={{ color: C.inkFaint, fontSize: 11.5 }}>até</span>
              <input type="time" className="rk-focus rk-mono" style={{ ...inputStyle, padding: '6px 8px' }} value={draft.turno_noite.end} onChange={e => update('turno_noite', 'end', e.target.value)} />
            </div>
          </div>
          <div style={{ border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: '12px 14px' }}>
            <div className="rk-display" style={{ fontSize: 13.5, fontWeight: 650, color: C.ink, marginBottom: 10 }}>Dia</div>
            <div className="rk-body" style={{ fontSize: 11.5, color: C.inkMuted, marginBottom: 4 }}>{SLOT_BY_KEY.diaria.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="time" className="rk-focus rk-mono" style={{ ...inputStyle, padding: '6px 8px' }} value={draft.diaria.start} onChange={e => update('diaria', 'start', e.target.value)} />
              <span className="rk-body" style={{ color: C.inkFaint, fontSize: 11.5 }}>até</span>
              <input type="time" className="rk-focus rk-mono" style={{ ...inputStyle, padding: '6px 8px' }} value={draft.diaria.end} onChange={e => update('diaria', 'end', e.target.value)} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ============================== MANAGER: ROOMS & PRICES ============================== */
function RoomsTab({ data, showToast }) {
  const [drafts, setDrafts] = useState(() => JSON.parse(JSON.stringify(data.rooms || [])));
  useEffect(() => { setDrafts(JSON.parse(JSON.stringify(data.rooms || []))); }, [data.rooms]);
  const [dirty, setDirty] = useState({});
  const updatePrice = (roomId, priceKey, value) => { setDrafts(drafts.map(r => r.id === roomId ? { ...r, prices: { ...r.prices, [priceKey]: Number(value) || 0 } } : r)); setDirty({ ...dirty, [roomId]: true }); };
  const toggleSlot = (roomId, wk, slotKey) => { setDrafts(drafts.map(r => r.id === roomId ? { ...r, availability: { ...r.availability, [wk]: { ...r.availability[wk], [slotKey]: !r.availability[wk][slotKey] } } } : r)); setDirty({ ...dirty, [roomId]: true }); };
  const save = async (roomId) => { const updated = (data.rooms || []).map(r => r.id === roomId ? drafts.find(d => d.id === roomId) : r); await data.saveRooms(updated); setDirty({ ...dirty, [roomId]: false }); showToast('Sala atualizada.', 'ok'); };

  return (
    <div className="rk-fade" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, lineHeight: 1.5 }}>Os horários de cada turno são os mesmos para todas as salas — configure-os uma única vez em <b>"Horários"</b>. Aqui você define apenas o preço de cada sala e em quais dias da semana ela oferece cada turno.</div>
      {drafts.map(room => (
        <Card key={room.id} style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div className="rk-display" style={{ fontSize: 18, fontWeight: 650, color: C.ink }}>{room.name}</div>
            {dirty[room.id] && <Btn size="sm" onClick={() => save(room.id)}>Salvar alterações</Btn>}
          </div>
          <div className="rk-body" style={{ fontSize: 12, fontWeight: 600, color: C.inkMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.03em' }}>Preços</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
            {[{ k: 'half', l: 'Meio turno' }, { k: 'shift', l: 'Turno completo' }, { k: 'daily', l: 'Diária' }].map(p => (
              <Field key={p.k} label={p.l}><div style={{ position: 'relative' }}><span className="rk-mono" style={{ position: 'absolute', left: 11, top: 9, fontSize: 13, color: C.inkFaint }}>R$</span><input type="number" min="0" className="rk-focus rk-mono" style={{ ...inputStyle, paddingLeft: 34 }} value={room.prices[p.k]} onChange={e => updatePrice(room.id, p.k, e.target.value)} /></div></Field>
            ))}
          </div>
          <div className="rk-body" style={{ fontSize: 12, fontWeight: 600, color: C.inkMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.03em' }}>Turnos oferecidos por dia da semana</div>
          <div className="rk-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px' }}></th>
                  <th colSpan={3} className="rk-body" style={{ textAlign: 'center', padding: '2px 8px', fontSize: 10.5, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' }}>Manhã</th>
                  <th colSpan={3} className="rk-body" style={{ textAlign: 'center', padding: '2px 8px', fontSize: 10.5, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' }}>Tarde</th>
                  <th className="rk-body" style={{ textAlign: 'center', padding: '2px 8px', fontSize: 10.5, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' }}>Noite</th>
                  <th className="rk-body" style={{ textAlign: 'center', padding: '2px 8px', fontSize: 10.5, color: C.inkFaint, fontWeight: 700, textTransform: 'uppercase' }}>Dia</th>
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11.5, color: C.inkFaint }}></th>
                  {SLOT_TYPES.map(st => <th key={st.key} className="rk-body" style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11.5, color: C.inkMuted, fontWeight: 600, borderTop: `1px solid ${C.borderSoft}` }}>{st.short}<br /><span className="rk-mono" style={{ fontSize: 10, fontWeight: 500, color: C.inkFaint }}>{timeRangeLabel(data.shiftHours, st.key)}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {WK_KEYS.map(wk => (
                  <tr key={wk}>
                    <td className="rk-body" style={{ padding: '6px 8px', fontSize: 12.5, color: C.ink, fontWeight: 500 }}>{WK_LABEL[wk]}</td>
                    {SLOT_TYPES.map(st => <td key={st.key} style={{ textAlign: 'center', padding: '6px 8px' }}><input type="checkbox" checked={!!room.availability[wk]?.[st.key]} onChange={() => toggleSlot(room.id, wk, st.key)} style={{ width: 16, height: 16, accentColor: C.primary, cursor: 'pointer' }} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================== MANAGER: RECURRING (FIXOS) ============================== */
function RecurringTab({ data, showToast }) {
  const all = data.bookings || [];
  const groupIds = [...new Set(all.filter(b => b.recurrence === 'fixa_mensal' && b.groupId).map(b => b.groupId))];
  const [editing, setEditing] = useState(null);
  const [draftDate, setDraftDate] = useState(''); const [draftPrice, setDraftPrice] = useState('');
  if (groupIds.length === 0) return <div className="rk-body rk-fade" style={{ color: C.inkFaint, fontSize: 14, padding: '30px 0' }}>Nenhuma locação fixa mensal confirmada ainda.</div>;

  const today = todayStr();
  const groups = groupIds.map(gid => {
    const items = all.filter(b => b.groupId === gid);
    const rep = items.find(b => b.id === gid) || items[0];
    const active = items.filter(b => b.status === 'confirmada').sort((a, b) => a.date < b.date ? -1 : 1);
    const past = active.filter(b => b.date < today).length;
    const future = active.filter(b => b.date >= today);
    const charges = active.filter(b => b.price > 0);
    const futureCharges = charges.filter(b => b.date >= today);
    const currentPrice = (futureCharges[0] || charges[charges.length - 1] || rep).price;
    return { gid, rep, active, past, future: future.length, endDate: rep.recurrenceEndDate, currentPrice };
  }).sort((a, b) => a.rep.userName.localeCompare(b.rep.userName));

  const startEditDate = (g) => { setEditing({ gid: g.gid, field: 'date' }); setDraftDate(g.endDate || todayStr()); };
  const startEditPrice = (g) => { setEditing({ gid: g.gid, field: 'price' }); setDraftPrice(g.currentPrice); };
  const saveDate = async (g) => {
    const room = (data.rooms || []).find(r => r.id === g.rep.roomId); if (!room) return;
    if (draftDate < g.rep.date) { showToast('A data final não pode ser anterior ao início.', 'err'); return; }
    const { updated, added, revived, cancelled } = reconcileRecurringGroup({ allBookings: all, room, groupId: g.gid, startDate: g.rep.date, slotType: g.rep.slotType, slotLabel: g.rep.slotLabel, newEndDate: draftDate, userId: g.rep.userId, userName: g.rep.userName, roomId: g.rep.roomId, roomName: g.rep.roomName, price: g.currentPrice, requestedAt: g.rep.requestedAt });
    await data.syncBookings(updated); setEditing(null);
    const parts = []; if (added) parts.push(`${added} nova(s)`); if (revived) parts.push(`${revived} reativada(s)`); if (cancelled) parts.push(`${cancelled} cancelada(s)`);
    showToast(parts.length ? `Data final atualizada: ${parts.join(', ')}.` : 'Data final atualizada.', 'ok');
  };
  const savePrice = async (g) => {
    const newPrice = Number(draftPrice) || 0;
    const groupConfirmed = all.filter(b => b.groupId === g.gid && b.status === 'confirmada').sort((a, b) => a.date < b.date ? -1 : 1);
    const seenMonths = new Set();
    const isFirstOfMonth = new Map();
    groupConfirmed.forEach(b => {
      const mk = b.date.slice(0, 7);
      const first = !seenMonths.has(mk);
      if (first) seenMonths.add(mk);
      isFirstOfMonth.set(b.id, first);
    });
    const updated = all.map(b => {
      if (b.groupId !== g.gid || b.status !== 'confirmada' || b.date < today) return b;
      return { ...b, price: isFirstOfMonth.get(b.id) ? newPrice : 0 };
    });
    await data.syncBookings(updated); setEditing(null);
    showToast(`Novo valor mensal (${fmtMoney(newPrice)}) aplicado a partir deste mês.`, 'ok');
  };

  return (
    <div className="rk-fade" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, marginBottom: 4, lineHeight: 1.5 }}>Cada locação fixa mensal reserva a sala toda semana, mas o valor negociado é cobrado uma vez por mês — as demais semanas do mês não geram cobrança adicional. Mudanças de valor valem a partir do mês atual, sem afetar cobranças já ocorridas.</div>
      {groups.map(g => (
        <Card key={g.gid} style={{ padding: '15px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div className="rk-body" style={{ fontSize: 14.5, fontWeight: 650, color: C.ink }}>{g.rep.userName}</div>
            <div className="rk-body" style={{ fontSize: 12.5, color: C.inkMuted, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}><span>{g.rep.roomName} · {g.rep.slotLabel}</span><span>toda {WK_LABEL[weekdayKey(g.rep.date)]}</span></div>
            <div className="rk-body" style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4 }}>início <span className="rk-mono">{fmtBR(g.rep.date)}</span> · {g.past} já ocorridas · {g.future} futuras confirmadas</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {editing?.gid === g.gid && editing.field === 'price' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}><span className="rk-mono" style={{ position: 'absolute', left: 9, top: 9, fontSize: 12, color: C.inkFaint }}>R$</span><input type="number" min="0" autoFocus className="rk-focus rk-mono" style={{ ...inputStyle, width: 120, paddingLeft: 30 }} value={draftPrice} onChange={e => setDraftPrice(e.target.value)} /></div>
                <Btn size="sm" variant="success" icon={Check} onClick={() => savePrice(g)}>Salvar</Btn><Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Btn>
              </div>
            ) : (
              <div style={{ textAlign: 'right' }}><div className="rk-body" style={{ fontSize: 10.5, fontWeight: 600, color: C.inkFaint, textTransform: 'uppercase' }}>Valor negociado</div><div className="rk-mono" style={{ fontSize: 14, fontWeight: 650, color: C.ink }}>{fmtMoney(g.currentPrice)}/mês</div><button onClick={() => startEditPrice(g)} className="rk-body" style={{ background: 'none', border: 'none', color: C.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 2 }}>alterar</button></div>
            )}
            {editing?.gid === g.gid && editing.field === 'date' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="date" autoFocus className="rk-focus rk-mono" style={{ ...inputStyle, width: 150 }} min={g.rep.date} value={draftDate} onChange={e => setDraftDate(e.target.value)} />
                <Btn size="sm" variant="success" icon={Check} onClick={() => saveDate(g)}>Salvar</Btn><Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Btn>
              </div>
            ) : (
              <div style={{ textAlign: 'right' }}><div className="rk-body" style={{ fontSize: 10.5, fontWeight: 600, color: C.inkFaint, textTransform: 'uppercase' }}>Repete até</div><div className="rk-mono" style={{ fontSize: 14, fontWeight: 650, color: C.ink }}>{fmtBR(g.endDate)}</div><button onClick={() => startEditDate(g)} className="rk-body" style={{ background: 'none', border: 'none', color: C.primary, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 2 }}>alterar</button></div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ============================== MANAGER: FINANCE ============================== */
function FinanceTab({ data, showToast }) {
  const [filter, setFilter] = useState('todos');
  const all = (data.bookings || []).filter(b => b.status === 'confirmada');
  const totals = financeForBookings(all);
  const filtered = all.filter(b => b.price > 0 && (filter === 'todos' || paymentBadgeStatus(b) === filter)).sort((a, b) => a.date < b.date ? 1 : -1);
  const togglePaid = async (b) => { const updated = (data.bookings || []).map(x => x.id === b.id ? { ...x, paymentStatus: x.paymentStatus === 'pago' ? 'pendente' : 'pago', paidAt: x.paymentStatus === 'pago' ? null : Date.now() } : x); await data.syncBookings(updated); showToast(b.paymentStatus === 'pago' ? 'Marcado como não pago.' : 'Pagamento registrado.', 'ok'); };
  return (
    <div className="rk-fade">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <StatCard label="Recebido" value={fmtMoney(totals.pago)} tone="success" icon={CheckCircle2} /><StatCard label="Em aberto" value={fmtMoney(totals.aberto)} tone="warning" icon={Clock} /><StatCard label="Vencido" value={fmtMoney(totals.vencido)} tone="danger" icon={AlertCircle} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[{ v: 'todos', l: 'Todos' }, { v: 'aberto', l: 'Em aberto' }, { v: 'vencido', l: 'Vencidos' }, { v: 'pago', l: 'Pagos' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} className="rk-body rk-btn rk-focus" style={{ padding: '6px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${filter === f.v ? C.primary : C.border}`, background: filter === f.v ? C.primary : C.surface, color: filter === f.v ? '#fff' : C.inkMuted }}>{f.l}</button>
        ))}
      </div>
      {filtered.length === 0 ? <div className="rk-body" style={{ color: C.inkFaint, fontSize: 13.5, padding: '20px 0' }}>Nenhum lançamento nesta categoria.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(b => (
            <Card key={b.id} style={{ padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div><div className="rk-body" style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{b.userName}</div><div className="rk-body" style={{ fontSize: 12, color: C.inkMuted, marginTop: 2 }}>{b.roomName} · {b.slotLabel} · <span className="rk-mono">{fmtBR(b.date)}</span></div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="rk-mono" style={{ fontWeight: 650, color: C.ink, fontSize: 14 }}>{fmtMoney(b.price)}</span><Badge tone={paymentBadgeStatus(b)}>{paymentBadgeStatus(b)}</Badge>
                <Btn size="sm" variant={b.paymentStatus === 'pago' ? 'subtle' : 'success'} icon={b.paymentStatus === 'pago' ? X : Check} onClick={() => togglePaid(b)}>{b.paymentStatus === 'pago' ? 'Desmarcar' : 'Recebido'}</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================== ROOT APP ============================== */
export default function App() {
  const data = useAppData();
  const [tab, setTab] = useState(null);
  const [toast, setToast] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const toastTimer = useRef(null);

  const showToast = (msg, type = 'info') => { setToast({ msg, type }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3200); };

  useEffect(() => { if (data.authEvent === 'PASSWORD_RECOVERY') setRecoveryMode(true); }, [data.authEvent]);
  useEffect(() => { if (data.profile && !tab) setTab(data.profile.role === 'manager' ? 'solicitacoes' : 'reservar'); }, [data.profile]);

  if (recoveryMode) return <RecoveryScreen showToast={showToast} onDone={() => setRecoveryMode(false)} />;

  if (data.ready === false || data.session === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{FONTS}</style>
        <Loader2 size={22} color={C.primary} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!data.session || !data.profile) {
    return <AuthScreen data={data} showToast={showToast} />;
  }

  const profile = data.profile;

  if (profile.status !== 'ativo') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <style>{FONTS}</style>
        <Card style={{ padding: '30px 28px', maxWidth: 380, textAlign: 'center' }}>
          {profile.status === 'pendente' ? (
            <><Clock size={28} color={C.warning} style={{ margin: '0 auto 12px' }} /><div className="rk-display" style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 6 }}>Cadastro em análise</div><div className="rk-body" style={{ fontSize: 13.5, color: C.inkMuted, lineHeight: 1.5 }}>Olá, {profile.name}. Seu acesso está aguardando aprovação do gestor.</div></>
          ) : (
            <><Ban size={28} color={C.danger} style={{ margin: '0 auto 12px' }} /><div className="rk-display" style={{ fontSize: 18, fontWeight: 650, color: C.ink, marginBottom: 6 }}>Conta desabilitada</div><div className="rk-body" style={{ fontSize: 13.5, color: C.inkMuted, lineHeight: 1.5 }}>Fale com o gestor da clínica para reativar seu acesso.</div></>
          )}
          <Btn variant="ghost" style={{ marginTop: 18 }} onClick={() => supabase.auth.signOut()}>Sair</Btn>
        </Card>
      </div>
    );
  }

  const pendingCount = (data.bookings || []).filter(b => b.status === 'pendente').length;
  const pendingUsers = (data.profiles || []).filter(u => u.role === 'tenant' && u.status === 'pendente').length;

  const managerTabs = [
    { key: 'nova-reserva', label: 'Nova Reserva', icon: Plus },
    { key: 'solicitacoes', label: 'Solicitações', icon: Clock, badge: pendingCount },
    { key: 'usuarios', label: 'Usuários', icon: Users, badge: pendingUsers },
    { key: 'horarios', label: 'Horários', icon: Clock },
    { key: 'salas', label: 'Salas & Preços', icon: Building2 },
    { key: 'fixos', label: 'Fixos', icon: Repeat },
    { key: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },
    { key: 'conta', label: 'Minha Conta', icon: User },
  ];
  const tenantTabs = [
    { key: 'reservar', label: 'Fazer reserva', icon: CalendarIcon },
    { key: 'minhas', label: 'Minhas reservas', icon: KeyRound },
    { key: 'financeiro-t', label: 'Financeiro', icon: CircleDollarSign },
    { key: 'conta', label: 'Minha Conta', icon: User },
  ];

  return (
    <Shell user={profile} onLogout={() => supabase.auth.signOut()} tabs={profile.role === 'manager' ? managerTabs : tenantTabs} active={tab} setActive={setTab} syncing={data.syncing} onRefresh={data.refresh}>
      {profile.role === 'manager' && (
        <>
          {tab === 'nova-reserva' && <ManagerBookTab data={data} profile={profile} showToast={showToast} />}
          {tab === 'solicitacoes' && <RequestsTab data={data} showToast={showToast} />}
          {tab === 'usuarios' && <UsersTab data={data} showToast={showToast} />}
          {tab === 'horarios' && <ShiftHoursTab data={data} showToast={showToast} />}
          {tab === 'salas' && <RoomsTab data={data} showToast={showToast} />}
          {tab === 'fixos' && <RecurringTab data={data} showToast={showToast} />}
          {tab === 'financeiro' && <FinanceTab data={data} showToast={showToast} />}
          {tab === 'conta' && <MyAccountTab profile={profile} showToast={showToast} />}
        </>
      )}
      {profile.role === 'tenant' && (
        <>
          {tab === 'reservar' && <BookTab data={data} profile={profile} showToast={showToast} />}
          {tab === 'minhas' && <MyBookingsTab data={data} profile={profile} showToast={showToast} />}
          {tab === 'financeiro-t' && <MyFinanceTab data={data} profile={profile} />}
          {tab === 'conta' && <MyAccountTab profile={profile} showToast={showToast} />}
        </>
      )}
      <Toast toast={toast} />
    </Shell>
  );
}
