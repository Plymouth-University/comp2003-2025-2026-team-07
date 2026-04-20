import { useState, useEffect } from 'react';
import './Settings.css';
import api from './services/api';

function UserSettings() {
    const [user, setUser] = useState(null);
    const [pagerId, setPagerId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testMessage, setTestMessage] = useState('');
    const [testError, setTestError] = useState('');

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const response = await api.getCurrentUser();
            setUser(response.data);
            setPagerId(response.data.pager_id || '');
        } catch (err) {
            setError('Failed to load user profile');
        }
    };

    const handleUpdatePagerId = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.updatePagerId(user.id, pagerId);
            setMessage('Pager ID updated successfully!');
            setUser(response.data);
        } catch (err) {
            setError(err.message || 'Failed to update pager ID');
        } finally {
            setLoading(false);
        }
    };

    const handleSendTestPage = async () => {
        setTestLoading(true);
        setTestMessage('');
        setTestError('');

        try {
            const response = await api.sendTestPage(pagerId || user?.pager_id);
            if (response.success) {
                setTestMessage('Test page sent! Check your Pagem app. Event ID: ' + (response.data?.eventId || response.data?.event_id || 'N/A'));
            } else {
                setTestError(response.error || response.message || 'Test page failed');
            }
        } catch (err) {
            setTestError(err.message || 'Failed to send test page');
        } finally {
            setTestLoading(false);
        }
    };

    if (!user) {
        return <div className="settings_section">Loading user profile...</div>;
    }

    return (
        <div className="settings_section">
            <h3>User Settings</h3>

            <div className="user_profile">
                <div className="profile_field">
                    <label>Username:</label>
                    <span>{user.username}</span>
                </div>
                <div className="profile_field">
                    <label>Email:</label>
                    <span>{user.email}</span>
                </div>
                <div className="profile_field">
                    <label>Role:</label>
                    <span>{user.role}</span>
                </div>
            </div>

            <form onSubmit={handleUpdatePagerId} className="pager_id_form">
                <h4>Pager Settings</h4>
                <p className="form_description">
                    Your pager ID is used to receive SMS notifications when vessel alerts are triggered.
                    You can find your Pagee API ID in your Pagem dashboard under Integrations → Pagem API.
                </p>

                <div className="form_group">
                    <label htmlFor="pager_id">Pagee API ID:</label>
                    <input
                        type="text"
                        id="pager_id"
                        value={pagerId}
                        onChange={(e) => setPagerId(e.target.value)}
                        placeholder="Enter your Pagee API ID (e.g., 8037)"
                        maxLength="20"
                        pattern="[a-zA-Z0-9]+"
                        title="Only alphanumeric characters allowed"
                        required
                    />
                    <small className="form_help">
                        Maximum 20 characters, alphanumeric only. Will be validated with Pagem API.
                    </small>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="update_btn"
                >
                    {loading ? 'Updating...' : 'Update Pager ID'}
                </button>
            </form>

            {message && <div className="success_message">{message}</div>}
            {error && <div className="error_message">{error}</div>}

            <div className="pager_test_section">
                <h4>Test Page</h4>
                <p className="form_description">
                    Send a test page to verify your Pager ID is correctly configured.
                </p>
                <button
                    type="button"
                    onClick={handleSendTestPage}
                    disabled={testLoading || !pagerId}
                    className="update_btn"
                >
                    {testLoading ? 'Sending...' : 'Send Test Page'}
                </button>
                {testMessage && <div className="success_message" style={{ marginTop: '10px' }}>{testMessage}</div>}
                {testError && <div className="error_message" style={{ marginTop: '10px' }}>{testError}</div>}
            </div>
        </div>
    );
}

export default UserSettings;