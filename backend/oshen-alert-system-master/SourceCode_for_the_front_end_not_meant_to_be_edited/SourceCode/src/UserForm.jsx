import { useState } from 'react';
import './Forms.css';

function UserForm({ onCancel, onSave }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'supervisor',
        pager_id: ''
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
        // Validate password length
        if (formData.password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }
        onSave(formData);
    };

    return (
        <div className="form_container" style={{ margin: '0', maxWidth: '100%' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#fff' }}>Add New User</h2>
            <form onSubmit={handleSubmit}>
                <div className="form_group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        placeholder="johndoe"
                        autoComplete="off"
                    />
                </div>

                <div className="form_group">
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="john@example.com"
                        autoComplete="off"
                    />
                </div>

                <div className="form_group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Minimum 6 characters"
                        autoComplete="new-password"
                        minLength={6}
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
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="viewer">Viewer</option>
                    </select>
                </div>

                <div className="form_group">
                    <label htmlFor="pager_id">Pager ID</label>
                    <input
                        type="text"
                        id="pager_id"
                        name="pager_id"
                        value={formData.pager_id}
                        onChange={handleChange}
                        required
                        placeholder="e.g., 99001"
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

//next steps
//1. add user form saving functionality
//2. add user form deletion functionality
//3. add user form editing functionality
//4. add user form color coding functionality
//5. add user form popup functionality
//6. add user form alert functionality
//7. add user form geofence functionality
//8. add user form tracking functionality
//9. add user form geofence functionality
