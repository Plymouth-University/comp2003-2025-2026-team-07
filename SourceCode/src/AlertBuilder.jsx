import React, { useState } from 'react';
import './Forms.css';

function AlertBuilder() {
    const [formData, setFormData] = useState({
        name: '',
        vesselId: '',
        fieldName: '',
        operator: '>',
        threshold: '',
        enabled: true
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
        console.log('Alert Rule Submitted:', formData);
        alert('Alert rule saved (mockup)!');
    };

    return (
        <div className="content_container">
            <h1>Alert Builder</h1>
            <div className="form_container">
                <form onSubmit={handleSubmit}>
                    <div className="form_group">
                        <label htmlFor="name">Rule Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g. High Temperature Alert"
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="vesselId">Vessel ID</label>
                        <input
                            type="number"
                            id="vesselId"
                            name="vesselId"
                            value={formData.vesselId}
                            onChange={handleChange}
                            required
                            placeholder="Enter Vessel ID"
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="fieldName">Field Name</label>
                        <input
                            type="text"
                            id="fieldName"
                            name="fieldName"
                            value={formData.fieldName}
                            onChange={handleChange}
                            required
                            placeholder="e.g. temperature, speed"
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="operator">Operator</label>
                        <select
                            id="operator"
                            name="operator"
                            value={formData.operator}
                            onChange={handleChange}
                        >
                            <option value=">">Greater Than (&gt;)</option>
                            <option value="<">Less Than (&lt;)</option>
                            <option value="=">Equals (=)</option>
                            <option value=">=">Greater or Equal (&gt;=)</option>
                            <option value="<=">Less or Equal (&lt;=)</option>
                        </select>
                    </div>

                    <div className="form_group">
                        <label htmlFor="threshold">Threshold Value</label>
                        <input
                            type="number"
                            id="threshold"
                            name="threshold"
                            value={formData.threshold}
                            onChange={handleChange}
                            required
                            step="0.01"
                        />
                    </div>

                    <div className="form_group">
                        <label>
                            <input
                                type="checkbox"
                                name="enabled"
                                checked={formData.enabled}
                                onChange={handleChange}
                            />
                            Rule Enabled
                        </label>
                    </div>

                    <div className="form_actions">
                        <button type="button" className="btn_secondary">Cancel</button>
                        <button type="submit" className="btn_primary">Create Alert Rule</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AlertBuilder;
