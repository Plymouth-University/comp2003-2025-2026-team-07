import React, { useState } from 'react';
import './Forms.css';

function UserForm({ onCancel, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'Viewer',
        pagerId: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="form_container" style={{ margin: '0', maxWidth: '100%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#fff' }}>Add New User</h2>
            <form onSubmit={handleSubmit}>
                <div className="form_group">
                    <label htmlFor="name">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="John Doe"
                    />
                </div>

                <div className="form_group">
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="text"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@example.com"
                    />
                </div>

                <div className="form_group">
                    <label htmlFor="role">Role</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                    >
                        <option value="Admin">Admin</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Viewer">Viewer</option>
                    </select>
                </div>

                <div className="form_group">
                    <label htmlFor="pagerId">Pager ID</label>
                    <input
                        type="text"
                        id="pagerId"
                        name="pagerId"
                        value={formData.pagerId}
                        onChange={handleChange}
                        placeholder="Optional"
                    />
                </div>

                <div className="form_actions">
                    <button type="button" className="btn_secondary" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="btn_primary">Create User</button>
                </div>
            </form>
        </div>
    );
}

export default UserForm;
