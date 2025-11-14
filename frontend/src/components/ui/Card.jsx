import styles from './Card.module.css';

function Card({ children, className = '', onClick }) {
  const classes = `${styles.card} ${className} ${onClick ? styles.clickable : ''}`;
  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}

export default Card;

