#!/usr/bin/env node

/**
 * Generate Random Answer Keys Script for ScoreHive
 * 
 * This script generates random answer keys for exam testing.
 * Compatible with the ScoreHive cluster format (EXAM_STAGE_001).
 * 
 * Usage:
 *   node generate-random-answers.js [options]
 * 
 * Options:
 *   --questions <number>    Number of questions per exam (default: 10)
 *   --exam-id <string>      Exam ID (default: EXAM_STAGE_001)
 *   --output <file>         Output file (default: random-answers.json)
 *   --pattern <type>        Answer pattern: balanced, sequential, random (default: balanced)
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  questions: 10,
  examId: 'EXAM_STAGE_001',
  output: 'random-answers.json',
  pattern: 'balanced'
};

// Answer options
const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'];

function parseArguments() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i += 2) {
    const arg = args[i];
    const value = args[i + 1];
    
    switch (arg) {
      case '--questions':
        config.questions = parseInt(value);
        if (isNaN(config.questions) || config.questions < 1) {
          console.error('❌ Error: --questions must be a positive number');
          process.exit(1);
        }
        break;
      case '--exam-id':
        config.examId = value;
        break;
      case '--output':
        config.output = value;
        break;
      case '--pattern':
        if (!['balanced', 'sequential', 'random'].includes(value)) {
          console.error('❌ Error: --pattern must be one of: balanced, sequential, random');
          process.exit(1);
        }
        config.pattern = value;
        break;
      case '--help':
        showHelp();
        process.exit(0);
      default:
        console.error(`❌ Error: Unknown argument ${arg}`);
        process.exit(1);
    }
  }
  
  return config;
}

function showHelp() {
  console.log(`
🔑 ScoreHive Random Answer Key Generator

Usage:
  node generate-random-answers.js [options]

Options:
  --questions <number>    Number of questions per exam (default: 10)
  --exam-id <string>      Exam ID (default: EXAM_STAGE_001)
  --output <file>         Output file (default: random-answers.json)
  --pattern <type>        Answer pattern: balanced, sequential, random (default: balanced)
  --help                  Show this help message

Examples:
  node generate-random-answers.js
  node generate-random-answers.js --questions 20 --output my-answers.json
  node generate-random-answers.js --pattern sequential --exam-id EXAM_FINAL
  
Pattern Types:
  balanced    - Even distribution of A, B, C, D answers
  sequential  - Rotating pattern A, B, C, D, A, B, C, D...
  random      - Completely random distribution
`);
}

function generateAnswerPattern(numQuestions, pattern) {
  const answers = [];
  
  switch (pattern) {
    case 'balanced':
      // Even distribution with some randomness
      const perOption = Math.floor(numQuestions / ANSWER_OPTIONS.length);
      const remainder = numQuestions % ANSWER_OPTIONS.length;
      
      // Create base distribution
      for (let i = 0; i < ANSWER_OPTIONS.length; i++) {
        const count = perOption + (i < remainder ? 1 : 0);
        for (let j = 0; j < count; j++) {
          answers.push(ANSWER_OPTIONS[i]);
        }
      }
      
      // Shuffle for randomness
      for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [answers[i], answers[j]] = [answers[j], answers[i]];
      }
      break;
      
    case 'sequential':
      // Rotating A, B, C, D pattern
      for (let i = 0; i < numQuestions; i++) {
        answers.push(ANSWER_OPTIONS[i % ANSWER_OPTIONS.length]);
      }
      break;
      
    case 'random':
      // Completely random
      for (let i = 0; i < numQuestions; i++) {
        const randomIndex = Math.floor(Math.random() * ANSWER_OPTIONS.length);
        answers.push(ANSWER_OPTIONS[randomIndex]);
      }
      break;
  }
  
  return answers;
}

function generateAnswerKeys(config) {
  const answers = generateAnswerPattern(config.questions, config.pattern);
  
  const answerKeys = {
    answer_keys: {
      [config.examId]: answers
    }
  };
  
  return answerKeys;
}

function saveToFile(data, filepath) {
  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Error saving file: ${error.message}`);
    return false;
  }
}

function analyzeAnswers(answers) {
  const distribution = {};
  ANSWER_OPTIONS.forEach(option => {
    distribution[option] = answers.filter(answer => answer === option).length;
  });
  
  return distribution;
}

function main() {
  console.log('🔑 ScoreHive Random Answer Key Generator\n');
  
  const config = parseArguments();
  
  console.log('Configuration:');
  console.log(`  📝 Questions: ${config.questions}`);
  console.log(`  🏷️  Exam ID: ${config.examId}`);
  console.log(`  📁 Output: ${config.output}`);
  console.log(`  🎲 Pattern: ${config.pattern}\n`);
  
  // Generate answer keys
  const answerKeys = generateAnswerKeys(config);
  const answers = answerKeys.answer_keys[config.examId];
  
  // Analyze distribution
  const distribution = analyzeAnswers(answers);
  
  console.log('Generated Answer Key:');
  console.log(`  Answers: ${answers.join(', ')}\n`);
  
  console.log('Distribution Analysis:');
  ANSWER_OPTIONS.forEach(option => {
    const count = distribution[option];
    const percentage = ((count / config.questions) * 100).toFixed(1);
    console.log(`  ${option}: ${count} (${percentage}%)`);
  });
  
  // Save to file
  if (saveToFile(answerKeys, config.output)) {
    console.log(`\n✅ Answer keys saved to: ${config.output}`);
    
    // Show usage instructions
    console.log('\n📋 Usage Instructions:');
    console.log('1. Copy the JSON content from the output file');
    console.log('2. Paste it in the ScoreHive frontend (🔑 Gestionar Claves tab)');
    console.log('3. Click "🔑 Configurar Claves" to set up the answer key');
    console.log('4. Generate matching exams to test grading');
    
    console.log('\n🔧 ScoreHive Commands:');
    console.log('  Frontend: cd frontend && npm run dev');
    console.log('  Adapter:  cd adapter && npm start');
    console.log('  Cluster:  cd cluster && ./run_cluster.sh');
  } else {
    console.log('\n❌ Failed to save answer keys');
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main();
}

module.exports = {
  generateAnswerKeys,
  generateAnswerPattern,
  analyzeAnswers
};