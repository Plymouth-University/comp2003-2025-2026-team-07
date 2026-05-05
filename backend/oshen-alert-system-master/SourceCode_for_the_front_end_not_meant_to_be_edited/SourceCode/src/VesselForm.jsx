import { useState, useEffect } from 'react';
import './Forms.css';
import api from './services/api';

function VesselForm() {
    const [formData, setFormData] = useState({
        name: '',
        imei: '',
        atSeaStatus: true,
        escalationThreshold: 3,
        repeatIntervalMins: 5,
        primarySupervisorId: '',
        secondarySupervisorId: ''
    });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.getAllUsers()
            .then(res => setUsers(res.data || []))
            .catch(() => {});
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const vesselData = {
                name: formData.name.trim(),
                imei: formData.imei.trim(),
                at_sea_status: formData.atSeaStatus,
                escalation_threshold: parseInt(formData.escalationThreshold),
                repeat_interval_mins: parseInt(formData.repeatIntervalMins),
                primary_supervisor_id: formData.primarySupervisorId ? parseInt(formData.primarySupervisorId) : null,
                secondary_supervisor_id: formData.secondarySupervisorId ? parseInt(formData.secondarySupervisorId) : null
            };

            await api.createVessel(vesselData);

            alert('Vessel created successfully! Go to the Cstars tab to view it.');

            setFormData({
                name: '',
                imei: '',
                atSeaStatus: true,
                escalationThreshold: 3,
                repeatIntervalMins: 5,
                primarySupervisorId: '',
                secondarySupervisorId: ''
            });
        } catch (err) {
            console.error('Error creating vessel:', err);
            setError(err.message || 'Failed to create vessel');
            alert('Error: ' + (err.message || 'Failed to create vessel'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: '',
            imei: '',
            atSeaStatus: true,
            escalationThreshold: 3,
            repeatIntervalMins: 5,
            primarySupervisorId: '',
            secondarySupervisorId: ''
        });
        setError(null);
    };

    return (
        <div className="content_container">
            <h1>Register New Vessel</h1>
            {error && (
                <div style={{
                    padding: '15px',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid #f44336',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    color: '#f44336'
                }}>
                    <strong>Error:</strong> {error}
                </div>
            )}
            <div className="form_container">
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
                            placeholder="e.g. Ocean Explorer"
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="imei">IMEI</label>
                        <input
                            type="text"
                            id="imei"
                            name="imei"
                            value={formData.imei}
                            onChange={handleChange}
                            required
                            placeholder="Unique Device ID"
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
                        <label>
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
                        <button type="button" className="btn_secondary" onClick={handleCancel} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn_primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Vessel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default VesselForm;