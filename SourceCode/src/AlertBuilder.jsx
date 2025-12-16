import { useState, useEffect } from 'react';
import './Forms.css';
import api from './services/api';

function AlertBuilder({ vessel, onSave, onCancel, existingRule }) {
    const [formData, setFormData] = useState({
        name: existingRule?.name || '',
        vesselId: vessel?.id || existingRule?.vessel_id || '',
        fieldName: existingRule?.field_name || '',
        operator: existingRule?.operator || '>',
        threshold: existingRule?.threshold || '',
        enabled: existingRule?.enabled !== undefined ? existingRule.enabled : true
    });
    const [vessels, setVessels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!vessel) {
            loadVessels();
        }
    }, [vessel]);

    const loadVessels = async () => {
        try {
            const response = await api.getVessels();
            setVessels(response.data || []);
        } catch (err) {
            console.error('Error loading vessels:', err);
            setError('Failed to load vessels');
        }
    };

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
            const alertData = {
                name: formData.name,
                vessel_id: parseInt(formData.vesselId),
                field_name: formData.fieldName,
                operator: formData.operator,
                threshold: parseFloat(formData.threshold),
                enabled: formData.enabled
            };

            if (existingRule) {
                // Update existing rule
                await api.updateAlertRule(existingRule.id, alertData);
                alert('Alert rule updated successfully!');
            } else {
                // Create new rule
                await api.createAlertRule(alertData);
                alert('Alert rule created successfully!');
            }

            if (onSave) {
                onSave(alertData);
            }
        } catch (err) {
            console.error('Error saving alert rule:', err);
            setError(err.message || 'Failed to save alert rule');
            alert('Error: ' + (err.message || 'Failed to save alert rule'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="content_container">
            <h1>{existingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</h1>
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
                        <label htmlFor="vesselId">Vessel</label>
                        {vessel ? (
                            <input
                                type="text"
                                value={vessel.name}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        ) : (
                            <select
                                id="vesselId"
                                name="vesselId"
                                value={formData.vesselId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select a vessel</option>
                                {vessels.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} (IMEI: {v.imei})
                                    </option>
                                ))}
                            </select>
                        )}
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
                        {onCancel && (
                            <button
                                type="button"
                                className="btn_secondary"
                                onClick={onCancel}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn_primary"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : existingRule ? 'Update Alert Rule' : 'Create Alert Rule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AlertBuilder;

//next steps
//1. add alert builder saving functionality
//2. add alert builder deletion functionality
//3. add alert builder editing functionality
//4. add alert builder color coding functionality
//5. add alert builder popup functionality
//6. add alert builder alert functionality
//7. add alert builder geofence functionality
//8. add alert builder tracking functionality
//9. add alert builder geofence functionality
