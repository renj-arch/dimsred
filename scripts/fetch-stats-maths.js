var miner = require('./lib/wiki-miner-core.js');

var STATS = null;
if (require.main === module) {
  miner.runMiner({
    idPrefix: 'stat',
    subject: 'Statistics & Mathematics',
    outPath: 'data/questions/statistics-mathematics.json',
    topics: {
      'Probability': ['Probability', 'Probability theory', 'Random variable', 'Probability distribution', 'Normal distribution', 'Binomial distribution', 'Poisson distribution', 'Central limit theorem', 'Law of large numbers', 'Law of total expectation'],
      'Statistical Inference': ['Statistical hypothesis testing', 'Null hypothesis', 'P-value', 'Confidence interval', 'Point estimation', 'Estimator', 'Maximum likelihood estimation', 'Sufficient statistic', 'Nonparametric statistics', 'Analysis of variance', 'Chi-squared test', "Student's t-distribution", 'Statistical power'],
      'Sampling & Design': ['Sampling (statistics)', 'Simple random sample', 'Stratified sampling', 'Cluster sampling', 'Systematic sampling', 'Design of experiments', 'Randomized controlled trial', 'Latin square', 'Cochran–Mansfield theorem', 'Survey methodology'],
      'Correlation, Regression & Time Series': ['Correlation', 'Regression analysis', 'Linear regression', 'Multiple linear regression', 'Logistic regression', 'Time series', 'Index number', 'Autoregressive model', 'Moving average', 'Least squares', 'Coefficient of determination'],
      'Algebra & Calculus': ['Algebra', 'Linear algebra', 'Matrix (mathematics)', 'Determinant', 'Eigenvalues and eigenvectors', 'Real analysis', 'Sequence', 'Series (mathematics)', 'Derivative', 'Integral', 'Differential equation', 'Ordinary differential equation', 'Partial differential equation', 'Complex analysis', 'Functional analysis', 'Vector calculus'],
      'Optimization & OR': ['Operations research', 'Linear programming', 'Simplex algorithm', 'Mathematical optimization', 'Sensitivity analysis', 'Queueing theory', 'Transportation problem', 'Game theory', 'Stochastic process'],
      'Economics': ['Microeconomics', 'Macroeconomics', 'Economics of development', 'Indian economy', 'Economic planning', 'Gross domestic product', 'Inflation', 'Money supply', 'Index of Industrial Production']
    }
  });
}