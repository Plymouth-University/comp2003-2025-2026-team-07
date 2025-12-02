import React, { useState, useEffect } from 'react';
import './Forms.css'; // Reusing form styles

function VesselSettingsModal({ vessel, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        imei: '',
        escalationThreshold: 3,
        repeatIntervalMins: 5,
        atSeaStatus: true
    });

    useEffect(() => {
        if (vessel) {
            setFormData({
                name: vessel.name || '',
                imei: vessel.imei || '',
                escalationThreshold: vessel.escalationThreshold || 3,
                repeatIntervalMins: vessel.repeatIntervalMins || 5,
                atSeaStatus: vessel.status !== 'offline' // deriving simple status for now
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
        onSave({ ...vessel, ...formData });
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
