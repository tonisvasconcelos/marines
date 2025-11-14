import { useQuery } from '@tanstack/react-query';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import styles from './Settings.module.css';

function SettingsUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => api.get('/settings/users'),
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Users</h1>
        <p>Manage user access and roles</p>
      </div>
      <Card>
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={styles.role}>{user.role}</span>
                  </td>
                  <td>
                    <button className={styles.actionButton}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className={styles.newButton}>+ Add User</button>
      </Card>
    </div>
  );
}

export default SettingsUsers;

