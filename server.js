const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const { mean, pow, sqrt } = require('mathjs');
const app = express();
const port = 5000;

app.use(cors());
let movies = [];
 let ratings = [];
// Load movies and ratings from CSV files
 fs.createReadStream('data/u.item')
 .pipe(csv({ separator: '|', headers: false }))
 .on('data', (row) => {
 movies.push({ movieId: row[0], title: row[1] });
 })
 .on('end', () => {
 console.log('Movies data loaded');
 console.log(movies);
 });
fs.createReadStream('data/u.data')
 .pipe(csv({ separator: '\t', headers: false }))
 .on('data', (row) => {
 ratings.push({ userId: row[0], movieId: row[1], rating: row[2] });
 })
 .on('end', () => {
 console.log('Ratings data loaded');
 console.log(ratings);
 });
// Calculate similarity between two users
 const calculateSimilarity = (userRatings1, userRatings2) => {
 const commonMovies = userRatings1.filter(r1 => userRatings2.some(r2 => r2.movieId === r1.movieId));
 if (commonMovies.length === 0) return 0;
const ratings1 = commonMovies.map(r => parseInt(r.rating));
 const ratings2 = commonMovies.map(r => parseInt(userRatings2.find(r2 => r2.movieId === r.movieId).rating));
const mean1 = mean(ratings1);
 const mean2 = mean(ratings2);
const numerator = ratings1.reduce((sum, rating, index) => sum + (rating - mean1) * (ratings2[index] - mean2), 0);
 const denominator = sqrt(ratings1.reduce((sum, rating) => sum + pow(rating - mean1, 2), 0)) * sqrt(ratings2.reduce((sum, rating) => sum + pow(rating - mean2, 2), 0));
return denominator === 0 ? 0 : numerator / denominator;
 };
// Recommendation logic using collaborative filtering
 const recommendMovies = (userId) => {
 const userRatings = ratings.filter(r => r.userId === userId);
 if (userRatings.length === 0) return [];
const otherUsers = ratings.filter(r => r.userId !== userId);
 const userRatingsByUser = otherUsers.reduce((acc, rating) => {
 acc[rating.userId] = acc[rating.userId] || [];
 acc[rating.userId].push(rating);
 return acc;
 }, {});
const similarities = Object.entries(userRatingsByUser).map(([otherUserId, otherUserRatings]) => {
 return { userId: otherUserId, similarity: calculateSimilarity(userRatings, otherUserRatings) };
 });
similarities.sort((a, b) => b.similarity - a.similarity);
const topSimilarUsers = similarities.slice(0, 5);
const movieScores = {};
 topSimilarUsers.forEach(({ userId, similarity }) => {
 userRatingsByUser[userId].forEach(rating => {
 if (!userRatings.some(r => r.movieId === rating.movieId)) {
 movieScores[rating.movieId] = movieScores[rating.movieId] || 0;
 movieScores[rating.movieId] += similarity * parseInt(rating.rating);
 }
 });
 });
const recommendedMovieIds = Object.entries(movieScores).sort((a, b) => b[1] - a[1]).map(([movieId]) => movieId);
return movies.filter(movie => recommendedMovieIds.includes(movie.movieId)).map(movie => movie.title);
 };
app.get('/recommend', (req, res) => {
 const userId = req.query.user_id;
 const recommendations = recommendMovies(userId);
 res.json(recommendations);
 });
app.listen(port, () => {
 console.log(`Server is running on http://localhost:${port}`);
 });