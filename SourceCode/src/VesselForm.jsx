import React, { useState } from 'react';
import './Forms.css';

function VesselForm() {
    const [formData, setFormData] = useState({
        name: '',
        imei: '',
        atSeaStatus: true,
        escalationThreshold: 3,
        repeatIntervalMins: 5
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Vessel Data Submitted:', formData);
        alert('Vessel saved (mockup)!');
    };

    return (
        <div className="content_container">
            <h1>Register New Vessel</h1>
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

                    <div className="form_actions">
                        <button type="button" className="btn_secondary">Cancel</button>
                        <button type="submit" className="btn_primary">Save Vessel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default VesselForm;
