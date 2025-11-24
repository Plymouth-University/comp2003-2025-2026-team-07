import React, { useState } from 'react';
import './UserSupport.css';
import UserForm from './UserForm';

function UserSupport() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin User', email: 'admin@oshen.com', role: 'Admin', pagerId: '99001' },
    { id: 2, name: 'Sarah Supervisor', email: 'sarah@oshen.com', role: 'Supervisor', pagerId: '99002' },
    { id: 3, name: 'Mike Monitor', email: 'mike@oshen.com', role: 'Viewer', pagerId: '-' },
  ]);

  const handleAddUser = (newUser) => {
    const userWithId = { ...newUser, id: users.length + 1 };
    setUsers([...users, userWithId]);
    setShowModal(false);
  };

  const handleDeleteUser = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(user => user.id !== id));
    }
  };

  const getRoleClass = (role) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'role_admin';
      case 'supervisor': return 'role_supervisor';
      default: return 'role_viewer';
    }
  };

  return (
    <div className='content_container'>
      <div className="user_header">
        <div>
          <h1>User Management</h1>
          <p style={{ color: '#a0a0a0', margin: '5px 0 0 0' }}>Manage team access and roles</p>
        </div>
        <button className="btn_primary" onClick={() => setShowModal(true)}>
          + Add User
        </button>
      </div>

      <div className="user_table_container">
        <table className="user_table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Pager ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role_badge ${getRoleClass(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace' }}>{user.pagerId}</td>
                <td>
                  <button className="action_btn">Edit</button>
                  <button
                    className="action_btn delete"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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