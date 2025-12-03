import { useState, useEffect } from 'react';
import './UserSupport.css';
import UserForm from './UserForm';
import api from './services/api';

function UserSupport({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = currentUser && currentUser.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAllUsers();
      setUsers(response.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (newUser) => {
    try {
      await api.createUser(newUser);
      setShowModal(false);
      // Reload users list
      await loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      alert('Failed to create user: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteUser = async (userId) => {
    // Double check they can't delete themselves
    if (userId === currentUser.id) {
      alert('You cannot delete your own account!');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.deleteUser(userId);
        // Remove from local state
        setUsers(users.filter(user => user.id !== userId));
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Failed to delete user: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const getRoleClass = (role) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'role_admin';
      case 'supervisor': return 'role_supervisor';
      default: return 'role_viewer';
    }
  };

  if (loading) {
    return (
      <div className='content_container'>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>🔄 Loading users...</h2>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className='content_container'>
        <div className="user_header">
          <div>
            <h1>User Management</h1>
            <p style={{ color: '#f44336', margin: '5px 0 0 0' }}>
              ⚠️ Admin access required to view and manage users
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='content_container'>
      <div className="user_header">
        <div>
          <h1>User Management</h1>
          <p style={{ color: '#a0a0a0', margin: '5px 0 0 0' }}>
            Manage team access and roles
          </p>
        </div>
        <button className="btn_primary" onClick={() => setShowModal(true)}>
          + Add User
        </button>
      </div>

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

      <div className="user_table_container">
        <table className="user_table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Pager ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isCurrentUser = user.id === currentUser.id;
              return (
                <tr key={user.id} style={isCurrentUser ? { backgroundColor: 'rgba(33, 150, 243, 0.1)' } : {}}>
                  <td>
                    {user.username}
                    {isCurrentUser && (
                      <span style={{
                        marginLeft: '10px',
                        color: '#2196F3',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>
                        (You)
                      </span>
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role_badge ${getRoleClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{user.pager_id || '-'}</td>
                  <td>
                    {!isCurrentUser ? (
                      <>
                        {/* <button className="action_btn">Edit</button> */}
                        <button
                          className="action_btn delete"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span style={{ color: '#757575', fontSize: '0.9rem' }}>
                        Cannot delete self
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#757575' }}>
            No users found
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal_overlay">
          <div className="modal_content">
            <UserForm
              onCancel={() => setShowModal(false)}
              onSave={handleAddUser}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSupport;