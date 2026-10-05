import http from 'http';
http.get('http://localhost:8080/bookings', res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('Body:', data));
});
