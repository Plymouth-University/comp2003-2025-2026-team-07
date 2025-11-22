import logo from './Oshen_logo.png';
import './UserSupport.css';

function UserSupport() {
  return (
    <div className='dashboard_container'>
      <div className="black_bar">
        <div className='logo'>
          <img src={logo} alt="Oshen Logo" className='logo'/>
        </div>
        <div className='buttons'>
          <button>Cstars</button>
          <button>Geofences</button>
          <button>User support</button>
        </div>
      
      </div>
    </div>
  );
}

export default UserSupport;