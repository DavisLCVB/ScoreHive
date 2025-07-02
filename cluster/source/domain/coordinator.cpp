#include "coordinator.hpp"
#include <spdlog/spdlog.h>
#include <domain/answers.hpp>

std::unique_ptr<MPICoordinator> MPICoordinator::_instance = nullptr;

MPICoordinator& MPICoordinator::instance() {
  if (!_instance) {
    _instance.reset(new MPICoordinator());
  }
  return *_instance;
}

MPICoordinator::MPICoordinator() {
  create_types();
  set_config(CoordinatorConfig());
}

void MPICoordinator::set_config(const CoordinatorConfig& config) {
  _config = config;
}

void MPICoordinator::create_types() {
  if (_types_created) {
    return;
  }
  {
    i32 count = 2;
    i32 block_lengths[] = {1, 1};
    MPI_Aint displacements[] = {offsetof(MPIQuestion, qst_idx),
                                offsetof(MPIQuestion, ans_idx)};
    MPI_Datatype types[] = {MPI_INT, MPI_INT};

    MPI_Type_create_struct(count, block_lengths, displacements, types,
                           &_mpi_question_type);
    MPI_Type_commit(&_mpi_question_type);
  }
  {
    i32 count = 6;
    i32 block_lengths[] = {1, 1, 1, 1, 1, 1};
    MPI_Aint displacements[] = {offsetof(MPIResult, stage),
                                offsetof(MPIResult, id_exam),
                                offsetof(MPIResult, correct_answers),
                                offsetof(MPIResult, wrong_answers),
                                offsetof(MPIResult, unscored_answers),
                                offsetof(MPIResult, score)};
    MPI_Datatype types[] = {MPI_INT, MPI_INT, MPI_INT,
                            MPI_INT, MPI_INT, MPI_DOUBLE};

    MPI_Type_create_struct(count, block_lengths, displacements, types,
                           &_mpi_result_type);
    MPI_Type_commit(&_mpi_result_type);
  }
  {
    i32 count = 3;
    i32 block_lengths[] = {1, 1, 1};
    MPI_Aint displacements[] = {offsetof(MPIExamHeader, stage),
                                offsetof(MPIExamHeader, id_exam),
                                offsetof(MPIExamHeader, answers_size)};
    MPI_Datatype types[] = {MPI_INT, MPI_INT, MPI_INT};
    MPI_Type_create_struct(count, block_lengths, displacements, types,
                           &_mpi_exam_header_type);
    MPI_Type_commit(&_mpi_exam_header_type);
  }
  _types_created = true;
}

void MPICoordinator::free_types() {
  if (_types_created) {
    MPI_Type_free(&_mpi_question_type);
    MPI_Type_free(&_mpi_result_type);
    _types_created = false;
  }
}

MPICoordinator::~MPICoordinator() {
  free_types();
}

void MPICoordinator::send_exam_batch(const std::vector<MPIExam>& exams,
                                     i32 dest_rank, i32 tag) {
  i32 exams_size = exams.size();
  auto send_result =
      MPI_Send(&exams_size, 1, MPI_INT, dest_rank, tag, MPI_COMM_WORLD);
  if (send_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to send exam batch size");
  }
  MPIExamHeader header;
  i32 size = 0;
  for (const auto& exam : exams) {
    size = static_cast<i32>(exam.answers.size());
    header = {exam.stage, exam.id_exam, size};
    send_result = MPI_Send(&header, 1, _mpi_exam_header_type, dest_rank, tag,
                           MPI_COMM_WORLD);
    if (send_result != MPI_SUCCESS) {
      throw std::runtime_error("Failed to send exam header");
    }
    if (!exam.answers.empty()) {
      send_result = MPI_Send(exam.answers.data(), size, _mpi_question_type,
                             dest_rank, tag, MPI_COMM_WORLD);
      if (send_result != MPI_SUCCESS) {
        throw std::runtime_error("Failed to send exam answers");
      }
    }
  }
}

std::vector<MPIExam> MPICoordinator::receive_exam_batch(i32 source_rank,
                                                        i32 tag) {
  i32 batch_size = 0;
  auto recv_result = MPI_Recv(&batch_size, 1, MPI_INT, source_rank, tag,
                              MPI_COMM_WORLD, MPI_STATUS_IGNORE);
  if (recv_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to receive exam batch size");
  }
  if (batch_size <= 0 || batch_size > std::numeric_limits<i32>::max()) {
    throw std::runtime_error("Invalid exam batch size");
  }
  std::vector<MPIExam> exams(batch_size);
  MPIExamHeader header;
  for (auto& exam : exams) {
    recv_result = MPI_Recv(&header, 1, _mpi_exam_header_type, source_rank, tag,
                           MPI_COMM_WORLD, MPI_STATUS_IGNORE);
    if (recv_result != MPI_SUCCESS) {
      throw std::runtime_error("Failed to receive exam header");
    }
    if (header.answers_size > 0) {
      exam.answers.resize(header.answers_size);
      recv_result =
          MPI_Recv(exam.answers.data(), header.answers_size, _mpi_question_type,
                   source_rank, tag, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
      if (recv_result != MPI_SUCCESS) {
        throw std::runtime_error("Failed to receive exam answers");
      }
    }
    exam.stage = header.stage;
    exam.id_exam = header.id_exam;
  }
  return exams;
}

void MPICoordinator::send_answers(const std::string& answers, i32 dest_rank,
                                  i32 tag) {
  i32 answers_size = answers.size();
  auto send_result =
      MPI_Send(&answers_size, 1, MPI_INT, dest_rank, tag, MPI_COMM_WORLD);
  if (send_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to send answers size");
  }
  send_result = MPI_Send(answers.data(), answers_size, MPI_CHAR, dest_rank, tag,
                         MPI_COMM_WORLD);
  if (send_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to send answers");
  }
}

std::string MPICoordinator::receive_answers(i32 source_rank, i32 tag) {
  i32 answers_size = 0;
  auto recv_result = MPI_Recv(&answers_size, 1, MPI_INT, source_rank, tag,
                              MPI_COMM_WORLD, MPI_STATUS_IGNORE);
  if (recv_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to receive answers size");
  }
  if (answers_size <= 0 || answers_size > std::numeric_limits<i32>::max()) {
    throw std::runtime_error("Invalid answers size");
  }
  std::string answers(answers_size, '\0');
  recv_result = MPI_Recv(answers.data(), answers_size, MPI_CHAR, source_rank,
                         tag, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
  if (recv_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to receive answers");
  }
  return answers;
}

void MPICoordinator::send_results(const std::vector<MPIResult>& results,
                                  i32 dest_rank, i32 tag) {
  i32 results_size = results.size();
  auto send_result =
      MPI_Send(&results_size, 1, MPI_INT, dest_rank, tag, MPI_COMM_WORLD);
  if (send_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to send results size");
  }
  for (const auto& result : results) {
    send_result =
        MPI_Send(&result, 1, _mpi_result_type, dest_rank, tag, MPI_COMM_WORLD);
    if (send_result != MPI_SUCCESS) {
      throw std::runtime_error("Failed to send results");
    }
  }
}

std::vector<MPIResult> MPICoordinator::receive_results(i32 source_rank,
                                                       i32 tag) {
  i32 results_size = 0;
  auto recv_result = MPI_Recv(&results_size, 1, MPI_INT, source_rank, tag,
                              MPI_COMM_WORLD, MPI_STATUS_IGNORE);
  if (recv_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to receive results size");
  }
  if (results_size <= 0 || results_size > std::numeric_limits<i32>::max()) {
    throw std::runtime_error("Invalid results size");
  }
  std::vector<MPIResult> results(results_size);
  for (auto& result : results) {
    recv_result = MPI_Recv(&result, 1, _mpi_result_type, source_rank, tag,
                           MPI_COMM_WORLD, MPI_STATUS_IGNORE);
    if (recv_result != MPI_SUCCESS) {
      throw std::runtime_error("Failed to receive results");
    }
  }
  return results;
}

std::vector<std::vector<MPIExam>> MPICoordinator::_slice_exams(
    const json& exams, i32 mpi_size) {
  try {
    i32 workers_size = mpi_size - 1;  // 0 is master
    i32 total_exams = static_cast<i32>(exams.size());

    // Si no hay exámenes, devolver vector vacío
    if (total_exams == 0) {
      spdlog::warn("No exams to slice");
      return std::vector<std::vector<MPIExam>>();
    }

    // Usar solo los workers necesarios (min entre workers disponibles y exámenes)
    i32 active_workers = std::min(workers_size, total_exams);
    i32 exams_per_worker =
        std::ceil(static_cast<double>(total_exams) / active_workers);

    // Solo crear slices para workers activos
    std::vector<std::vector<MPIExam>> exams_slices(active_workers);

    spdlog::info(
        "Distributing {} exams among {} active workers ({} exams per worker)",
        total_exams, active_workers, exams_per_worker);

    i32 start_idx = 0;
    i32 end_idx = 0;
    for (i32 i = 0; i < active_workers; i++) {
      start_idx = i * exams_per_worker;
      end_idx = std::min(start_idx + exams_per_worker, total_exams);
      auto slice_size = end_idx - start_idx;

      // Solo procesar si hay exámenes para este worker
      if (slice_size <= 0) {
        spdlog::warn("Worker {} has no exams to process", i + 1);
        continue;
      }
      exams_slices[i].resize(slice_size);
      for (i32 j = start_idx; j < end_idx && j < static_cast<i32>(exams.size());
           j++) {
        if (j >= static_cast<i32>(exams.size())) {
          spdlog::error("Exam index {} out of bounds (size: {})", j,
                        exams.size());
          break;
        }

        json exam = exams[j];
        auto& slice = exams_slices[i];
        MPIExam& mpi_exam = slice[j - start_idx];

        // Validar que el examen tenga los campos requeridos
        if (!exam.contains("stage") || !exam.contains("id_exam") ||
            !exam.contains("answers")) {
          spdlog::error("Exam {} missing required fields", j);
          throw std::runtime_error("Invalid exam format");
        }

        mpi_exam.stage = exam["stage"];
        mpi_exam.id_exam = exam["id_exam"];

        // Validar que answers sea un array
        if (!exam["answers"].is_array()) {
          spdlog::error("Exam {} answers field is not an array", j);
          throw std::runtime_error("Answers must be an array");
        }

        mpi_exam.answers.resize(exam["answers"].size());
        for (size_t k = 0; k < exam["answers"].size(); k++) {
          auto& answer = exam["answers"][k];
          if (!answer.contains("qst_idx") || !answer.contains("ans_idx")) {
            spdlog::error("Answer {} in exam {} missing required fields", k, j);
            throw std::runtime_error("Invalid answer format");
          }
          mpi_exam.answers[k].qst_idx = answer["qst_idx"];
          mpi_exam.answers[k].ans_idx = answer["ans_idx"];
        }
      }
    }
    return exams_slices;
  } catch (std::exception& e) {
    spdlog::error("Error slicing exams: {}", e.what());
    return std::vector<std::vector<MPIExam>>();
  }
}

void MPICoordinator::send_to_workers(const json& exams_to_review,
                                     i32 mpi_size) {
  auto exams_slices = _slice_exams(exams_to_review, mpi_size);
  auto active_workers = exams_slices.size();

  // Limpiar la lista de workers activos
  _active_workers.clear();

  if (active_workers == 0) {
    spdlog::warn("No workers to send exams to");
    return;
  }

  spdlog::info("Sending work to {} active workers out of {} available",
               active_workers, mpi_size - 1);

  for (size_t i = 0; i < active_workers; i++) {
    auto exam_slice = exams_slices[i];

    // Validar que el slice no esté vacío
    if (exam_slice.empty()) {
      spdlog::warn("Worker {} received empty exam slice, skipping", i + 1);
      continue;
    }

    auto required_stages = std::vector<i32>(exam_slice.size());
    std::transform(exam_slice.begin(), exam_slice.end(),
                   required_stages.begin(),
                   [](const MPIExam& exam) { return exam.stage; });
    auto answer_keys_serialized =
        AnswersManager::instance().serialize_for_mpi(required_stages);
    auto worker_rank = i + 1;  // 0 is master

    spdlog::info("Sending {} exams to worker {}", exam_slice.size(),
                 worker_rank);

    // Registrar este worker como activo
    _active_workers.push_back(worker_rank);

    send_command(MPICommand::REVIEW, worker_rank, _config.mpi_tag_command);
    send_answers(answer_keys_serialized, worker_rank, _config.mpi_tag_answers);
    send_exam_batch(exam_slice, worker_rank, _config.mpi_tag_exams);
  }
}

void MPICoordinator::send_shutdown_signal(i32 mpi_size) {
  for (i32 i = 0; i < mpi_size - 1; i++) {
    auto worker_rank = i + 1;  // 0 is master
    send_command(MPICommand::SHUTDOWN, worker_rank, _config.mpi_tag_command);
  }
}

json MPICoordinator::receive_results_from_workers(i32 /* mpi_size */) {
  std::vector<MPIResult> results;

  if (_active_workers.empty()) {
    spdlog::warn("No active workers to receive results from");
    return json(results);
  }

  spdlog::info("Waiting for results from {} active workers",
               _active_workers.size());

  // Solo esperar resultados de workers activos
  for (auto worker_rank : _active_workers) {
    spdlog::info("Receiving results from worker {}", worker_rank);
    auto worker_results = receive_results(worker_rank, _config.mpi_tag_results);
    results.insert(results.end(), worker_results.begin(), worker_results.end());
  }

  spdlog::info("Received {} total results from all active workers",
               results.size());
  json results_json = results;
  return results_json;
}

std::pair<std::vector<MPIExam>, MPICommand> MPICoordinator::receive_from_master(
    i32 master_rank) {
  auto command = receive_command(master_rank, _config.mpi_tag_command);
  if (command == MPICommand::SHUTDOWN) {
    return {std::vector<MPIExam>(), MPICommand::SHUTDOWN};
  }
  if (command != MPICommand::REVIEW) {
    throw std::runtime_error("Invalid command received from master");
  }
  auto answers = receive_answers(master_rank, _config.mpi_tag_answers);
  AnswersManager::instance().load_from_json(json::parse(answers));
  auto exams = receive_exam_batch(master_rank, _config.mpi_tag_exams);
  return {exams, command};
}

void MPICoordinator::send_to_master(const std::vector<MPIResult>& results,
                                    i32 master_rank) {
  spdlog::debug("Sending results to master: {}", results.size());
  send_results(results, master_rank, _config.mpi_tag_results);
}

void MPICoordinator::send_command(MPICommand command, i32 dest_rank, i32 tag) {
  auto command_num = static_cast<u8>(command);
  auto send_result = MPI_Send(&command_num, 1, MPI_UNSIGNED_CHAR, dest_rank,
                              tag, MPI_COMM_WORLD);
  if (send_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to send command");
  }
}

MPICommand MPICoordinator::receive_command(i32 source_rank, i32 tag) {
  u8 command_num = 0;
  auto recv_result = MPI_Recv(&command_num, 1, MPI_UNSIGNED_CHAR, source_rank,
                              tag, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
  if (recv_result != MPI_SUCCESS) {
    throw std::runtime_error("Failed to receive command");
  }
  return static_cast<MPICommand>(command_num);
}