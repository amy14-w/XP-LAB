import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, BarChart3, MoreHorizontal, Trash2, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { classesAPI } from '../../services/api';

const More = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadClasses = async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      const data = await classesAPI.getAll(user.user_id);
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [user]);

  const toggleSelect = (classId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    const confirm1 = window.confirm(`Delete ${count} class${count > 1 ? 'es' : ''}? This will remove related lectures and records.`);
    if (!confirm1) return;
    const confirm2 = window.confirm('Are you sure? This action cannot be undone.');
    if (!confirm2) return;

    try {
      setDeleting(true);
      for (const classId of selected) {
        try {
          await classesAPI.delete(classId, user.user_id);
        } catch (e) {
          console.error('Failed to delete class', classId, e);
        }
      }
      setSelected(new Set());
      await loadClasses();
      alert('Selected classes deleted.');
    } catch (e) {
      alert('Some deletions may have failed. Check console for details.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Sidebar */}
      <div className="flex h-[calc(100vh)]">
        <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-6">
          <nav className="space-y-2">
            <button onClick={() => navigate('/professor/dashboard')} className="nav-item w-full">
              <BookOpen size={20} />
              <span>CLASSES</span>
            </button>
            <button onClick={() => navigate('/professor/analytics')} className="nav-item w-full">
              <BarChart3 size={20} />
              <span>ANALYTICS</span>
            </button>
            <button onClick={() => navigate('/professor/students')} className="nav-item w-full">
              <Users size={20} />
              <span>STUDENTS</span>
            </button>
            <button className="nav-item nav-item-active w-full">
              <MoreHorizontal size={20} />
              <span>MORE</span>
            </button>
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Manage Courses</h2>
              <button
                disabled={deleting || selected.size === 0}
                onClick={deleteSelected}
                className={`btn-danger flex items-center gap-2 ${deleting || selected.size === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Trash2 size={18} />
                Delete Selected ({selected.size})
              </button>
            </div>

            <div className="glass-card p-4">
              {classes.length === 0 ? (
                <p className="text-slate-400">No courses found.</p>
              ) : (
                <div className="divide-y divide-slate-700">
                  {classes.map(cls => {
                    const isSelected = selected.has(cls.class_id);
                    return (
                      <div key={cls.class_id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleSelect(cls.class_id)}
                            className="text-slate-300 hover:text-cyan-400"
                            aria-label={isSelected ? 'Deselect' : 'Select'}
                          >
                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                          <div>
                            <p className="font-semibold">{cls.name}</p>
                            <p className="text-xs text-slate-500">{cls.class_id}</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const ok = window.confirm(`Delete "${cls.name}"? This will remove related lectures and records.`);
                            if (!ok) return;
                            await classesAPI.delete(cls.class_id, user.user_id);
                            await loadClasses();
                          }}
                          className="text-red-400 hover:text-red-300 flex items-center gap-2"
                        >
                          <Trash2 size={18} />
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default More;

