#!/usr/bin/env node

/**
 * Generate 1000 Exam Files Script for ScoreHive
 * 
 * This script generates large batches of exam files for performance testing
 * and stress testing of the ScoreHive MPI cluster system.
 * 
 * Usage:
 *   node generate-1000-exams.js [options]
 * 
 * Options:
 *   --count <number>        Number of exams to generate (default: 1000)
 *   --questions <number>    Number of questions per exam (default: 10)
 *   --exam-id <string>      Exam ID for all exams (default: EXAM_STAGE_001)
 *   --output <file>         Output file (default: 1000-exams.json)
 *   --batch-size <number>   Students per batch file (default: all in one file)
 *   --correct-rate <number> Probability of correct answers 0-1 (default: 0.7)
 *   --student-prefix <str>  Student ID prefix (default: EST)
 *   --answer-key <file>     Use specific answer key file for correct answers
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  count: 1000,
  questions: 10,
  examId: 'EXAM_STAGE_001',
  output: '1000-exams.json',
  batchSize: null, // null means all in one file
  correctRate: 0.7, // 70% probability of correct answers
  studentPrefix: 'EST',
  answerKey: null
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
      case '--count':
        config.count = parseInt(value);
        if (isNaN(config.count) || config.count < 1) {
          console.error('❌ Error: --count must be a positive number');
          process.exit(1);
        }
        break;
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
      case '--batch-size':
        config.batchSize = parseInt(value);
        if (isNaN(config.batchSize) || config.batchSize < 1) {
          console.error('❌ Error: --batch-size must be a positive number');
          process.exit(1);
        }
        break;
      case '--correct-rate':
        config.correctRate = parseFloat(value);
        if (isNaN(config.correctRate) || config.correctRate < 0 || config.correctRate > 1) {
          console.error('❌ Error: --correct-rate must be between 0 and 1');
          process.exit(1);
        }
        break;
      case '--student-prefix':
        config.studentPrefix = value;
        break;
      case '--answer-key':
        config.answerKey = value;
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
📝 ScoreHive 1000 Exam Generator

Usage:
  node generate-1000-exams.js [options]

Options:
  --count <number>        Number of exams to generate (default: 1000)
  --questions <number>    Number of questions per exam (default: 10)
  --exam-id <string>      Exam ID for all exams (default: EXAM_STAGE_001)
  --output <file>         Output file (default: 1000-exams.json)
  --batch-size <number>   Students per batch file (creates multiple files)
  --correct-rate <number> Probability of correct answers 0-1 (default: 0.7)
  --student-prefix <str>  Student ID prefix (default: EST)
  --answer-key <file>     Use specific answer key file for correct answers
  --help                  Show this help message

Examples:
  # Generate 1000 exams with default settings
  node generate-1000-exams.js

  # Generate 5000 exams with 80% correct rate
  node generate-1000-exams.js --count 5000 --correct-rate 0.8

  # Generate in batches of 100 students each
  node generate-1000-exams.js --count 1000 --batch-size 100

  # Use specific answer key for generating realistic answers
  node generate-1000-exams.js --answer-key random-answers.json

  # Generate for performance testing
  node generate-1000-exams.js --count 10000 --correct-rate 0.65 --output stress-test.json

Performance Tips:
  - Use --batch-size for very large datasets to create multiple files
  - Higher --correct-rate values will result in more passing students
  - Use --answer-key to ensure realistic answer patterns
`);
}

function loadAnswerKey(filepath) {
  try {
    if (!fs.existsSync(filepath)) {
      console.error(`❌ Error: Answer key file not found: ${filepath}`);
      return null;
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.answer_keys || typeof data.answer_keys !== 'object') {
      console.error('❌ Error: Invalid answer key format. Expected { "answer_keys": { "exam_id": [...] } }');
      return null;
    }
    
    return data.answer_keys;
  } catch (error) {
    console.error(`❌ Error loading answer key: ${error.message}`);
    return null;
  }
}

function generateStudentAnswers(numQuestions, correctRate, correctAnswers = null) {
  const answers = [];
  
  for (let i = 0; i < numQuestions; i++) {
    let selectedAnswer;
    
    if (Math.random() < correctRate && correctAnswers && correctAnswers[i]) {
      // Use correct answer from answer key
      selectedAnswer = correctAnswers[i];
    } else if (Math.random() < correctRate && !correctAnswers) {
      // Default to 'A' as most likely correct (simple heuristic)
      selectedAnswer = 'A';
    } else {
      // Generate wrong answer
      const wrongAnswers = correctAnswers && correctAnswers[i] 
        ? ANSWER_OPTIONS.filter(opt => opt !== correctAnswers[i])
        : ANSWER_OPTIONS.filter(opt => opt !== 'A');
      
      selectedAnswer = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
    }
    
    answers.push(selectedAnswer);
  }
  
  return answers;
}

function generateExamBatch(startIndex, count, config, correctAnswers) {
  const exams = [];
  
  for (let i = 0; i < count; i++) {
    const studentNumber = startIndex + i + 1;
    const studentId = `${config.studentPrefix}${studentNumber.toString().padStart(6, '0')}`;
    
    const answers = generateStudentAnswers(
      config.questions, 
      config.correctRate, 
      correctAnswers
    );
    
    exams.push({
      student_id: studentId,
      exam_id: config.examId,
      answers: answers
    });
  }
  
  return exams;
}

function saveExamBatch(exams, filename, batchNumber = null) {
  const data = { exams };
  
  try {
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    
    const suffix = batchNumber !== null ? ` (batch ${batchNumber})` : '';
    console.log(`✅ Saved ${exams.length} exams to: ${filename}${suffix}`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving file ${filename}: ${error.message}`);
    return false;
  }
}

function analyzeExamGeneration(allExams, correctAnswers) {
  const totalExams = allExams.length;
  const questionsPerExam = allExams[0]?.answers.length || 0;
  
  // Calculate expected vs actual correct answers
  let totalCorrectAnswers = 0;
  let totalAnswers = 0;
  
  allExams.forEach(exam => {
    if (correctAnswers) {
      exam.answers.forEach((answer, index) => {
        totalAnswers++;
        if (answer === correctAnswers[index]) {
          totalCorrectAnswers++;
        }
      });
    }
  });
  
  const actualCorrectRate = totalAnswers > 0 ? totalCorrectAnswers / totalAnswers : 0;
  
  // Answer distribution analysis
  const answerDistribution = {};
  ANSWER_OPTIONS.forEach(option => {
    answerDistribution[option] = 0;
  });
  
  allExams.forEach(exam => {
    exam.answers.forEach(answer => {
      if (answerDistribution[answer] !== undefined) {
        answerDistribution[answer]++;
      }
    });
  });
  
  return {
    totalExams,
    questionsPerExam,
    totalAnswers,
    actualCorrectRate,
    answerDistribution
  };
}

function main() {
  console.log('📝 ScoreHive 1000 Exam Generator\n');
  
  const config = parseArguments();
  
  // Load answer key if provided
  let correctAnswers = null;
  if (config.answerKey) {
    console.log(`🔑 Loading answer key from: ${config.answerKey}`);
    const answerKeys = loadAnswerKey(config.answerKey);
    if (answerKeys) {
      correctAnswers = answerKeys[config.examId];
      if (!correctAnswers) {
        console.error(`❌ Error: No answer key found for exam ID: ${config.examId}`);
        console.log(`Available exam IDs: ${Object.keys(answerKeys).join(', ')}`);
        process.exit(1);
      }
      console.log(`✅ Loaded ${correctAnswers.length} correct answers for ${config.examId}`);
      
      // Adjust questions count to match answer key
      if (config.questions !== correctAnswers.length) {
        console.log(`🔧 Adjusting questions count from ${config.questions} to ${correctAnswers.length} to match answer key`);
        config.questions = correctAnswers.length;
      }
    } else {
      process.exit(1);
    }
  }
  
  console.log('\nConfiguration:');
  console.log(`  📊 Exam Count: ${config.count}`);
  console.log(`  📝 Questions: ${config.questions}`);
  console.log(`  🏷️  Exam ID: ${config.examId}`);
  console.log(`  🎯 Correct Rate: ${(config.correctRate * 100).toFixed(1)}%`);
  console.log(`  👤 Student Prefix: ${config.studentPrefix}`);
  console.log(`  📁 Output: ${config.output}`);
  if (config.batchSize) {
    console.log(`  📦 Batch Size: ${config.batchSize} students per file`);
  }
  if (correctAnswers) {
    console.log(`  🔑 Answer Key: ${correctAnswers.join(', ')}`);
  }
  console.log('');
  
  const startTime = Date.now();
  let allExams = [];
  
  if (config.batchSize && config.count > config.batchSize) {
    // Generate in batches and save to multiple files
    const totalBatches = Math.ceil(config.count / config.batchSize);
    console.log(`📦 Generating ${totalBatches} batches...`);
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const startIndex = batchNum * config.batchSize;
      const batchCount = Math.min(config.batchSize, config.count - startIndex);
      
      console.log(`📝 Generating batch ${batchNum + 1}/${totalBatches} (${batchCount} exams)...`);
      
      const batchExams = generateExamBatch(startIndex, batchCount, config, correctAnswers);
      allExams = allExams.concat(batchExams);
      
      // Save batch file
      const batchFilename = config.output.replace(/\.json$/, `-batch-${(batchNum + 1).toString().padStart(3, '0')}.json`);
      saveExamBatch(batchExams, batchFilename, batchNum + 1);
    }
    
    // Also save complete file
    console.log(`📝 Saving complete file with all ${config.count} exams...`);
    saveExamBatch(allExams, config.output);
    
  } else {
    // Generate all at once
    console.log(`📝 Generating ${config.count} exams...`);
    allExams = generateExamBatch(0, config.count, config, correctAnswers);
    saveExamBatch(allExams, config.output);
  }
  
  const endTime = Date.now();
  const generationTime = ((endTime - startTime) / 1000).toFixed(2);
  
  // Analyze generation
  const analysis = analyzeExamGeneration(allExams, correctAnswers);
  
  console.log('\n📊 Generation Analysis:');
  console.log(`  ⏱️  Generation Time: ${generationTime} seconds`);
  console.log(`  📝 Total Exams: ${analysis.totalExams}`);
  console.log(`  ❓ Questions Per Exam: ${analysis.questionsPerExam}`);
  console.log(`  🎯 Target Correct Rate: ${(config.correctRate * 100).toFixed(1)}%`);
  
  if (correctAnswers) {
    console.log(`  ✅ Actual Correct Rate: ${(analysis.actualCorrectRate * 100).toFixed(1)}%`);
    const deviation = Math.abs(analysis.actualCorrectRate - config.correctRate) * 100;
    console.log(`  📏 Deviation: ${deviation.toFixed(1)}%`);
  }
  
  console.log('\n📈 Answer Distribution:');
  const totalAnswers = analysis.totalAnswers;
  ANSWER_OPTIONS.forEach(option => {
    const count = analysis.answerDistribution[option];
    const percentage = totalAnswers > 0 ? ((count / totalAnswers) * 100).toFixed(1) : '0.0';
    console.log(`  ${option}: ${count} (${percentage}%)`);
  });
  
  // Performance estimates
  const examsPerSecond = (analysis.totalExams / (generationTime || 1)).toFixed(0);
  console.log(`\n⚡ Performance: ${examsPerSecond} exams/second`);
  
  // Usage instructions
  console.log('\n📋 Usage Instructions:');
  console.log('1. Copy the JSON content from the output file(s)');
  console.log('2. Paste it in the ScoreHive frontend (🚀 Calificar Exámenes tab)');
  console.log('3. Make sure answer keys are configured first');
  console.log('4. Click "🚀 Calificar Exámenes" to process');
  console.log('5. Monitor MPI cluster performance during processing');
  
  console.log('\n🚀 Performance Testing Tips:');
  console.log('- Start with smaller batches (100-500 exams) to test system capacity');
  console.log('- Monitor cluster resource usage during processing');
  console.log('- Use multiple batch files for testing different scenarios');
  console.log('- Consider using --correct-rate 0.6-0.8 for realistic distributions');
  
  console.log('\n✅ Generation completed successfully!');
}

// Handle command line execution
if (require.main === module) {
  main();
}

module.exports = {
  generateExamBatch,
  generateStudentAnswers,
  analyzeExamGeneration
};