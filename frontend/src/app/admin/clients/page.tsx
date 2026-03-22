"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { 
    Contact2, 
    Plus, 
    Search, 
    Mail, 
    Phone, 
    MapPin, 
    Facebook, 
    Instagram, 
    Video, 
    Calendar,
    ChevronRight,
    Loader2,
    X,
    Trash2,
    Pencil,
    Users,
    MessageSquare,
    ExternalLink
} from 'lucide-react';

export default function ClientsPage() {
    const { user } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingClientId, setEditingClientId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        business_name: '',
        primary_contact_name: '',
        primary_contact_role: '',
        phone: '',
        whatsapp: '',
        email: '',
        location: '',
        facebook_url: '',
        tiktok_url: '',
        instagram_url: '',
        referral_source: 'OTHER',
        birthday: '',
        anniversary: '',
        follow_up_date: '',
        upsell_potential: ''
    });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await api.get('/clients/');
            setClients(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const prepareData = (raw: typeof formData) => {
        const data: any = { ...raw };
        // Convert empty strings to null for optional fields to satisfy backend Pydantic schemas (EmailStr, etc.)
        Object.keys(data).forEach(key => {
            if (data[key] === '') {
                data[key] = null;
            }
        });
        
        // Format dates correctly
        if (data.birthday) data.birthday = new Date(data.birthday).toISOString();
        if (data.anniversary) data.anniversary = new Date(data.anniversary).toISOString();
        if (data.follow_up_date) data.follow_up_date = new Date(data.follow_up_date).toISOString();
        
        return data;
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = prepareData(formData);
            await api.post('/clients/', data);
            closeForm();
            fetchClients();
        } catch (err: any) {
            alert('Failed to create client: ' + (err.response?.data?.detail?.[0]?.msg || err.message));
        }
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClientId) return;
        try {
            const data = prepareData(formData);
            await api.put(`/clients/${editingClientId}`, data);
            closeForm();
            fetchClients();
        } catch (err: any) {
            alert('Failed to update client: ' + (err.response?.data?.detail?.[0]?.msg || err.message));
        }
    };

    const openEditForm = (client: any) => {
        setEditingClientId(client.id);
        setIsEditMode(true);
        // Map nulls back to empty strings for form inputs
        setFormData({
            business_name: client.business_name || '',
            primary_contact_name: client.primary_contact_name || '',
            primary_contact_role: client.primary_contact_role || '',
            phone: client.phone || '',
            whatsapp: client.whatsapp || '',
            email: client.email || '',
            location: client.location || '',
            facebook_url: client.facebook_url || '',
            tiktok_url: client.tiktok_url || '',
            instagram_url: client.instagram_url || '',
            referral_source: client.referral_source || 'OTHER',
            birthday: client.birthday ? client.birthday.split('T')[0] : '',
            anniversary: client.anniversary ? client.anniversary.split('T')[0] : '',
            follow_up_date: client.follow_up_date ? client.follow_up_date.split('T')[0] : '',
            upsell_potential: client.upsell_potential || ''
        });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setIsEditMode(false);
        setEditingClientId(null);
        setFormData({
            business_name: '', primary_contact_name: '', primary_contact_role: '',
            phone: '', whatsapp: '', email: '', location: '',
            facebook_url: '', tiktok_url: '', instagram_url: '',
            referral_source: 'OTHER', birthday: '', anniversary: '',
            follow_up_date: '', upsell_potential: ''
        });
    };

    const handleDeleteClient = async (id: number) => {
        if (!confirm('Are you sure you want to delete this client?')) return;
        try {
            await api.delete(`/clients/${id}`);
            setClients(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert('Failed to delete client');
        }
    };

    const filteredClients = clients.filter(c => 
        c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.primary_contact_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;

    return (
        <div className="p-4 sm:p-8 font-sans max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Client CRM</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your business identities and contact relationships.</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search clients..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                        />
                    </div>
                    <button 
                        onClick={() => setIsFormOpen(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center space-x-2 shrink-0 hover:bg-indigo-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Client</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map(client => (
                    <div key={client.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow relative group">
                        <div className="absolute top-4 right-4 flex items-center space-x-2">
                             <button 
                                onClick={() => openEditForm(client)}
                                className="text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Edit Client"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            {user?.role === 'ADMIN' && (
                                <button 
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Client"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        
                        <div>
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{client.referral_source.replace(/_/g, ' ')}</span>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{client.business_name}</h3>
                            <p className="text-sm text-gray-500 font-medium">{client.primary_contact_name} · {client.primary_contact_role}</p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-50">
                            {client.phone && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <Phone className="w-4 h-4 text-green-500" />
                                    <span>{client.phone}</span>
                                </div>
                            )}
                            {client.email && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <Mail className="w-4 h-4 text-blue-400" />
                                    <span className="truncate">{client.email}</span>
                                </div>
                            )}
                            {client.location && (
                                <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-red-400" />
                                    <span>{client.location}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-3 pt-2">
                            {client.facebook_url && (
                                <a href={client.facebook_url} target="_blank" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Facebook className="w-4 h-4" />
                                </a>
                            )}
                            {client.instagram_url && (
                                <a href={client.instagram_url} target="_blank" className="p-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100 transition-colors">
                                    <Instagram className="w-4 h-4" />
                                </a>
                            )}
                            {client.tiktok_url && (
                                <a href={client.tiktok_url} target="_blank" className="p-2 bg-black text-white rounded-lg hover:opacity-80 transition-opacity">
                                    <Video className="w-4 h-4" />
                                </a>
                            )}
                        </div>

                        {client.follow_up_date && (
                            <div className="mt-4 p-3 bg-indigo-50 rounded-xl flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-700">
                                    <Calendar className="w-4 h-4" />
                                    <span>Follow-up: {new Date(client.follow_up_date).toLocaleDateString()}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-indigo-400" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal Form */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit Client Identity' : 'Add New Client Identity'}</h2>
                            <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <form onSubmit={isEditMode ? handleUpdateClient : handleCreateClient} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Business Name</label>
                                    <input required type="text" value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="e.g. Maruti Suzuki Nepal" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Contact Person</label>
                                    <input required type="text" value={formData.primary_contact_name} onChange={e => setFormData({...formData, primary_contact_name: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="e.g. John Doe" />
                                </div>
                                <div className="space-y-1 text-gray-900">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Phone / WhatsApp</label>
                                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="+977 98..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="client@example.com" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Social Media Handles</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input type="text" value={formData.facebook_url} onChange={e => setFormData({...formData, facebook_url: e.target.value})} className="border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="Facebook URL" />
                                    <input type="text" value={formData.instagram_url} onChange={e => setFormData({...formData, instagram_url: e.target.value})} className="border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="Instagram URL" />
                                    <input type="text" value={formData.tiktok_url} onChange={e => setFormData({...formData, tiktok_url: e.target.value})} className="border border-gray-200 rounded-xl p-2.5 text-sm" placeholder="TikTok URL" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Referral Source</label>
                                    <select value={formData.referral_source} onChange={e => setFormData({...formData, referral_source: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-white">
                                        <option value="DIRECT_WALK_IN">Direct Walk-in</option>
                                        <option value="FACEBOOK_AD">Facebook Ad</option>
                                        <option value="FRIEND">Friend / Recommendation</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Next Follow-up</label>
                                    <input type="date" value={formData.follow_up_date} onChange={e => setFormData({...formData, follow_up_date: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Upsell Potential / Notes</label>
                                <textarea value={formData.upsell_potential} onChange={e => setFormData({...formData, upsell_potential: e.target.value})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm h-24" placeholder="e.g. Needs a full YouTube documentary later..." />
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                                {isEditMode ? 'Update Client Profile' : 'Create Client Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
