import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../../context/WebSocketContext';
import { adminService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import {
  LayoutDashboard, Package, Eye, MessageSquare, IndianRupee,
  Loader2, Search, Trash2, CheckCircle, XCircle, Clock, ShoppingBag,
} from 'lucide-react';
import { formatPrice, titleCase, formatDate } from '../../utils/format';

const EMPTY_OVERVIEW = { total_listings: 0, available: 0, pending: 0, sold_out: 0, total_inquiries: 0, avg_price: 0, total_views: 0 };
const EMPTY_ORDERS = { total_orders: 0, total_revenue: 0, avg_order_value: 0 };

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="stat-card">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
      <Icon size={18} color={accent || 'var(--accent)'} />
      <span className="stat-label">{label}</span>
    </div>
    <div className="stat-value">{value}</div>
  </div>
);

const StatusBadge = ({ status }) => <span className={`badge badge-${status}`}>{titleCase(status)}</span>;

const Dashboard = () => {
  const { lastMessage } = useWebSocket();
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [ordersOverview, setOrdersOverview] = useState(EMPTY_ORDERS);
  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  const loadOverview = useCallback(async () => {
    try {
      const [ov, bc, tr, oo] = await Promise.all([
        adminService.getOverview(),
        adminService.getByCategory(),
        adminService.getListingsTrend(),
        adminService.getOrdersOverview(),
      ]);
      setOverview(ov);
      setByCategory(bc);
      setTrend(tr);
      setOrdersOverview(oo);
    } catch (err) { console.error(err); }
  }, []);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getStats({ skip: page * limit, limit, search, status: statusFilter });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadListings(); }, [loadListings]);

  useEffect(() => {
    if (!lastMessage) return;
    if (['new_listing', 'listing_status_update', 'new_inquiry', 'new_order'].includes(lastMessage.type)) {
      loadOverview();
      loadListings();
    }
  }, [lastMessage, loadOverview, loadListings]);

  const handleStatusChange = async (productId, status) => {
    try {
      await adminService.updateListingStatus(productId, status);
      loadListings();
      loadOverview();
    } catch { }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      await adminService.deleteListing(productId);
      loadListings();
      loadOverview();
    } catch { }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <LayoutDashboard size={28} color="var(--accent)" /> Admin Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={Package} label="Total Listings" value={overview.total_listings} />
        <StatCard icon={CheckCircle} label="Available" value={overview.available} accent="var(--success)" />
        <StatCard icon={Clock} label="Pending" value={overview.pending} accent="var(--warning)" />
        <StatCard icon={IndianRupee} label="Avg. Price" value={formatPrice(overview.avg_price)} />
        <StatCard icon={MessageSquare} label="Total Inquiries" value={overview.total_inquiries} />
        <StatCard icon={Eye} label="Total Views" value={overview.total_views} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={ShoppingBag} label="Total Orders" value={ordersOverview.total_orders} accent="var(--secondary)" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={formatPrice(ordersOverview.total_revenue)} accent="var(--secondary)" />
        <StatCard icon={IndianRupee} label="Avg. Order Value" value={formatPrice(ordersOverview.avg_order_value)} accent="var(--secondary)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="panel">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Listings by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>New Listings (14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', flex: 1 }}>Manage Listings</h3>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input className="input" style={{ marginBottom: 0, paddingLeft: '32px', width: '220px' }} placeholder="Search listings..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <select className="input" style={{ marginBottom: 0, width: '160px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="sold_out">Sold Out</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={32} /></div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Listing</th><th>Price</th><th>Views</th><th>Inquiries</th><th>Status</th><th>Listed</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.product_id}>
                      <td>{item.title}</td>
                      <td>{formatPrice(item.price)}</td>
                      <td>{item.views}</td>
                      <td>{item.inquiries}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {item.status !== 'available' && (
                            <button className="btn-sm btn-outline" onClick={() => handleStatusChange(item.product_id, 'available')} title="Approve">
                              <CheckCircle size={13} />
                            </button>
                          )}
                          {item.status !== 'rejected' && (
                            <button className="btn-sm btn-outline" onClick={() => handleStatusChange(item.product_id, 'rejected')} title="Reject">
                              <XCircle size={13} />
                            </button>
                          )}
                          <button className="btn-sm btn-danger" onClick={() => handleDelete(item.product_id)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-sm btn-outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn-sm btn-outline" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
