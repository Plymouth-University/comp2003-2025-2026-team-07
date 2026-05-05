import { useState, useEffect } from 'react';
import './Forms.css';
import api from './services/api';

function VesselSettingsModal({ vessel, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        imei: '',
        escalationThreshold: 3,
        repeatIntervalMins: 5,
        atSeaStatus: true,
        primarySupervisorId: '',
        secondarySupervisorId: ''
    });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        api.getAllUsers()
            .then(res => setUsers(res.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (vessel) {
            setFormData({
                name: vessel.name || '',
                imei: vessel.imei || '',
                escalationThreshold: vessel.escalation_threshold || vessel.escalationThreshold || 3,
                repeatIntervalMins: vessel.repeat_interval_mins || vessel.repeatIntervalMins || 5,
                atSeaStatus: vessel.status !== 'offline',
                primarySupervisorId: vessel.primary_supervisor_id || '',
                secondarySupervisorId: vessel.secondary_supervisor_id || ''
            });
        }
    }, [vessel]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...vessel,
            name: formData.name,
            imei: formData.imei,
            escalation_threshold: parseInt(formData.escalationThreshold),
            repeat_interval_mins: parseInt(formData.repeatIntervalMins),
            at_sea_status: formData.atSeaStatus,
            primary_supervisor_id: formData.primarySupervisorId ? parseInt(formData.primarySupervisorId) : null,
            secondary_supervisor_id: formData.secondarySupervisorId ? parseInt(formData.secondarySupervisorId) : null
        });
    };

    if (!vessel) return null;

    return (
        <div className="modal_overlay">
            <div className="modal_content">
                <div className="modal_header">
                    <h2>Vessel Settings: {vessel.name}</h2>
                    <button className="close_button" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form_group">
                        <label htmlFor="name">Vessel Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="imei">IMEI (Read-only)</label>
                        <input
                            type="text"
                            id="imei"
                            name="imei"
                            value={formData.imei}
                            readOnly
                            className="input_readonly"
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="escalationThreshold">Escalation Threshold</label>
                        <input
                            type="number"
                            id="escalationThreshold"
                            name="escalationThreshold"
                            value={formData.escalationThreshold}
                            onChange={handleChange}
                            min="1"
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="repeatIntervalMins">Repeat Interval (Minutes)</label>
                        <input
                            type="number"
                            id="repeatIntervalMins"
                            name="repeatIntervalMins"
                            value={formData.repeatIntervalMins}
                            onChange={handleChange}
                            min="1"
                        />
                    </div>

                    <div className="form_group">
                        <label className="checkbox_label">
                            <input
                                type="checkbox"
                                name="atSeaStatus"
                                checked={formData.atSeaStatus}
                                onChange={handleChange}
                            />
                            At Sea Status
                        </label>
                    </div>

                    <div className="form_group">
                        <label htmlFor="primarySupervisorId">Primary Supervisor</label>
                        <select
                            id="primarySupervisorId"
                            name="primarySupervisorId"
                            value={formData.primarySupervisorId}
                            onChange={handleChange}
                        >
                            <option value="">— None —</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className="form_group">
                        <label htmlFor="secondarySupervisorId">Secondary Supervisor</label>
                        <select
                            id="secondarySupervisorId"
                            name="secondarySupervisorId"
                            value={formData.secondarySupervisorId}
                            onChange={handleChange}
                        >
                            <option value="">— None —</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                            ))}
                        </select>
                        <small className="form_help">
                            Assigned supervisors will receive a Pagem notification when this vessel triggers an alert.
                            Make sure each supervisor has a Pager ID set in their User Settings.
                        </small>
                    </div>

                    <div className="form_actions">
                        <button type="button" className="btn_secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn_primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default VesselSettingsModal;