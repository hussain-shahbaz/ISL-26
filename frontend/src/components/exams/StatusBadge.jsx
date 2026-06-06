const STATUS_COLORS = {
  draft:     '#gray',
  saved:     '#blue',
  published: '#green',
  submitted: '#orange',
  checked:   '#purple'
};

const StatusBadge = ({ status }) => {
  return (
    <span style={{ 
      backgroundColor: STATUS_COLORS[status] || '#gray',
      padding: '2px 8px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px'
    }}>
      {status}
    </span>
  );
};

export default StatusBadge;