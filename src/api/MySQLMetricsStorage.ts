import { createConnection, Connection, RowDataPacket } from 'mysql2/promise';
import { IMetricsStorage } from './IMetricsStorage';
import { storage_config } from '../../config';
import { Tenant } from '../model/Tenant';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CopilotMetrics,
  CopilotIdeCodeCompletions,
  CopilotIdeCodeCompletionsLanguage,
  CopilotIdeCodeCompletionsEditor,
  CopilotIdeCodeCompletionsEditorModel,
  CopilotIdeCodeCompletionsEditorModelLanguage,
  CopilotIdeChat,
  CopilotIdeChatEditor,
  CopilotIdeChatEditorModel,
  CopilotDotcomChat,
  CopilotDotcomChatModel,
  CopilotDotcomPullRequests,
  CopilotDotcomPullRequestsRepository,
  CopilotDotcomPullRequestsRepositoryModel
} from '../model/Copilot_Metrics';

export class MySQLMetricsStorage implements IMetricsStorage {
  private dbConnection: Connection | null = null;
  private scope_name: string = '';
  private type: string = '';
  private team?: string = '';
  private initialized: boolean = false;

  constructor(tenant: Tenant) {
    this.initConnection();
    this.initializeScope(tenant);
    this.initializeDatabase();
  }

  private async initConnection() {
    try {
      this.dbConnection = await createConnection({
        host: storage_config.DB?.HOST,
        user: storage_config.DB?.USER,
        password: storage_config.DB?.PASSWORD,
        database: storage_config.DB?.DATABASE,
        port: storage_config.DB?.PORT,
      });
      console.log('Database connection established successfully in Metrics Module.');
      this.initialized = true;
    } catch (error) {
      console.error('Error connecting to the database:', error);
      this.initialized = false;
    }
  }

  public async initializeScope(tenant: Tenant) {
    try {
      this.scope_name = tenant.scopeName;
      this.type = tenant.scopeType;
      this.team = tenant.team;
    } catch (error) {
      console.error('Error initializing Metrics scope:', error);
    }
  }

  
  
  private async initializeDatabase() {
    await this.ensureInitialized();
    const sqlFilePath = join(__dirname, 'sql_file', 'mysql_copilot_metrics.sql');
    const sql = readFileSync(sqlFilePath, 'utf-8');
  
    const connection = this.dbConnection;
    if (!connection) {
      console.error('Database connection is not initialized.');
      return;
    }
  
    try {
      const statements = sql.split(';').map(stmt => stmt.trim()).filter(stmt => stmt.length > 0);
      for (const statement of statements) {
        await connection.execute(statement);
      }
      console.log('Database Metrics tables initialized.');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

private async ensureInitialized() {
  if (!this.initialized) {
    console.log('Re-initializing connection in Metrics Module...');
    await this.initConnection();
  }
}


public async saveMetrics(metricsData: CopilotMetrics[], team_slug?: string): Promise<boolean> {
  await this.ensureInitialized();
  if (!team_slug) {
    team_slug = this.team;
  }
  const connection = this.dbConnection;
  if (!connection) {
    console.error('Database connection is not initialized.');
    return false;
  }
  try {
    for (const metric of metricsData) {

      // check whether this date's record already exists
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        `
        SELECT id FROM copilot_metrics
        WHERE date = ? AND scope_type = ? AND scope_name = ? AND team = ?
        `,
        this.sanitizeSqlParams([
          metric.date,
          this.type,
          this.scope_name,
          team_slug || '',
        ])
      );
      // if record already exists, check if the fields are the same
      if (existingRows.length > 0) {
        const existingRecord = existingRows[0];
        // Record exists, remove related records
        const removed = await this.removeMetrics(existingRecord.id);
        if (!removed) {
          console.error(`Failed to remove existing metrics for date: ${metric.date}`);
          continue;
        }
      }


      console.log(`Saving metrics for date: ${metric.date} of team: ${team_slug}`);
      const transaction = await connection.beginTransaction();

      try {
        // Insert into copilot_metrics table
        const [metricsResult] = await connection.execute<RowDataPacket[]>(
          `
          INSERT INTO copilot_metrics (
            date,
            total_active_users,
            total_engaged_users,
            scope_type,
            scope_name,
            team
          ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          this.sanitizeSqlParams([
            metric.date,
            metric.total_active_users,
            metric.total_engaged_users,
            this.type,
            this.scope_name,
            team_slug || '',
          ])
        );

        const metricsId = (metricsResult as any).insertId;

        // Save copilot_ide_code_completions
        if (metric.copilot_ide_code_completions) {
          const copilotIdeCodeCompletions = metric.copilot_ide_code_completions;

          // Insert into copilot_ide_code_completions table
          const [completionResult] = await connection.execute<RowDataPacket[]>(
            `
            INSERT INTO copilot_ide_code_completions (
              metrics_id,
              total_engaged_users
            ) VALUES (?, ?)
            `,
            this.sanitizeSqlParams([metricsId, copilotIdeCodeCompletions.total_engaged_users])
          );

          const completionId = (completionResult as any).insertId;

          // Insert languages
          for (const language of copilotIdeCodeCompletions.languages) {
            await connection.execute<RowDataPacket[]>(
              `
              INSERT INTO copilot_ide_code_completions_languages (
                metrics_id,
                completion_id,
                name,
                total_engaged_users
              ) VALUES (?, ?, ?, ?)
              `,
              this.sanitizeSqlParams([
                metricsId,
                completionId,
                language.name,
                language.total_engaged_users,
              ])
            );
          }

          // Insert editors
          for (const editor of copilotIdeCodeCompletions.editors) {
            const [editorResult] = await connection.execute<RowDataPacket[]>(
              `
              INSERT INTO copilot_ide_code_completions_editors (
                metrics_id,
                completion_id,
                name,
                total_engaged_users
              ) VALUES (?, ?, ?, ?)
              `,
              this.sanitizeSqlParams([
                metricsId,
                completionId,
                editor.name,
                editor.total_engaged_users,
              ])
            );

            const editorId = (editorResult as any).insertId;

            // Insert models
            for (const model of editor.models) {
              // 确保模型有所有必需的字段
              const safeModel = this.ensureModelDefaults(model);
              
              const [modelResult] = await connection.execute<RowDataPacket[]>(
                `
                INSERT INTO copilot_ide_code_completions_editor_models (
                  metrics_id,
                  editor_id,
                  name,
                  is_custom_model,
                  custom_model_training_date,
                  total_engaged_users
                ) VALUES (?, ?, ?, ?, ?, ?)
                `,
                this.sanitizeSqlParams([
                  metricsId,
                  editorId,
                  safeModel.name,
                  safeModel.is_custom_model,
                  safeModel.custom_model_training_date,
                  safeModel.total_engaged_users,
                ])
              );

              const modelId = (modelResult as any).insertId;

              // Insert model languages
              for (const language of safeModel.languages) {
                await connection.execute<RowDataPacket[]>(
                  `
                  INSERT INTO copilot_ide_code_completions_editor_model_languages (
                    metrics_id,
                    model_id,
                    name,
                    total_engaged_users,
                    total_code_suggestions,
                    total_code_acceptances,
                    total_code_lines_suggested,
                    total_code_lines_accepted
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `,
                  this.sanitizeSqlParams([
                    metricsId,
                    modelId,
                    language.name,
                    language.total_engaged_users,
                    language.total_code_suggestions,
                    language.total_code_acceptances,
                    language.total_code_lines_suggested,
                    language.total_code_lines_accepted,
                  ])
                );
              }
            }
          }
        }

        // Save copilot_ide_chat
        if (metric.copilot_ide_chat) {
          const copilotIdeChat = metric.copilot_ide_chat;

          // Insert into copilot_ide_chat table
          const [ideChatResult] = await connection.execute<RowDataPacket[]>(
            `
            INSERT INTO copilot_ide_chat (
              metrics_id,
              total_engaged_users
            ) VALUES (?, ?)
            `,
            this.sanitizeSqlParams([metricsId, copilotIdeChat.total_engaged_users])
          );

          const ideChatId = (ideChatResult as any).insertId;

          // Insert editors
          for (const editor of copilotIdeChat.editors) {
            const [editorResult] = await connection.execute<RowDataPacket[]>(
              `
              INSERT INTO copilot_ide_chat_editors (
                metrics_id,
                ide_chat_id,
                name,
                total_engaged_users
              ) VALUES (?, ?, ?, ?)
              `,
              this.sanitizeSqlParams([
                metricsId,
                ideChatId,
                editor.name,
                editor.total_engaged_users,
              ])
            );

            const editorId = (editorResult as any).insertId;

            // Insert models
            for (const model of editor.models) {
              // 确保模型有所有必需的字段
              const safeModel = this.ensureModelDefaults(model);
              
              await connection.execute<RowDataPacket[]>(
                `
                INSERT INTO copilot_ide_chat_editor_models (
                  metrics_id,
                  editor_id,
                  name,
                  is_custom_model,
                  custom_model_training_date,
                  total_engaged_users,
                  total_chats,
                  total_chat_insertion_events,
                  total_chat_copy_events
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                this.sanitizeSqlParams([
                  metricsId,
                  editorId,
                  safeModel.name,
                  safeModel.is_custom_model,
                  safeModel.custom_model_training_date,
                  safeModel.total_engaged_users,
                  safeModel.total_chats,
                  safeModel.total_chat_insertion_events,
                  safeModel.total_chat_copy_events,
                ])
              );
            }
          }
        }

        // Save copilot_dotcom_chat
        if (metric.copilot_dotcom_chat) {
          const copilotDotcomChat = metric.copilot_dotcom_chat;

          // Insert into copilot_dotcom_chat table
          const [dotcomChatResult] = await connection.execute<RowDataPacket[]>(
            `
            INSERT INTO copilot_dotcom_chat (
              metrics_id,
              total_engaged_users
            ) VALUES (?, ?)
            `,
            this.sanitizeSqlParams([metricsId, copilotDotcomChat.total_engaged_users])
          );

          const dotcomChatId = (dotcomChatResult as any).insertId;

          // Insert models
          for (const model of copilotDotcomChat.models) {
            // 确保模型有所有必需的字段
            const safeModel = this.ensureModelDefaults(model);
            
            await connection.execute<RowDataPacket[]>(
              `
              INSERT INTO copilot_dotcom_chat_models (
                metrics_id,
                dotcom_chat_id,
                name,
                is_custom_model,
                custom_model_training_date,
                total_engaged_users,
                total_chats
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `,
              this.sanitizeSqlParams([
                metricsId,
                dotcomChatId,
                safeModel.name,
                safeModel.is_custom_model,
                safeModel.custom_model_training_date,
                safeModel.total_engaged_users,
                safeModel.total_chats,
              ])
            );
          }
        }

        // Save copilot_dotcom_pull_requests
        if (metric.copilot_dotcom_pull_requests) {
          const copilotPRs = metric.copilot_dotcom_pull_requests;

          // Insert into copilot_dotcom_pull_requests table
          const [prResult] = await connection.execute<RowDataPacket[]>(
            `
            INSERT INTO copilot_dotcom_pull_requests (
              metrics_id,
              total_engaged_users
            ) VALUES (?, ?)
            `,
            this.sanitizeSqlParams([metricsId, copilotPRs.total_engaged_users])
          );

          const prId = (prResult as any).insertId;

          // Insert repositories
          for (const repo of copilotPRs.repositories) {
            const [repoResult] = await connection.execute<RowDataPacket[]>(
              `
              INSERT INTO copilot_dotcom_pull_requests_repositories (
                metrics_id,
                pull_requests_id,
                name,
                total_engaged_users
              ) VALUES (?, ?, ?, ?)
              `,
              this.sanitizeSqlParams([
                metricsId,
                prId,
                repo.name,
                repo.total_engaged_users,
              ])
            );

            const repoId = (repoResult as any).insertId;

            // Insert models
            for (const model of repo.models) {
              // 确保模型有所有必需的字段
              const safeModel = this.ensureModelDefaults(model);
              
              await connection.execute<RowDataPacket[]>(
                `
                INSERT INTO copilot_dotcom_pull_requests_repository_models (
                  metrics_id,
                  repository_id,
                  name,
                  is_custom_model,
                  custom_model_training_date,
                  total_pr_summaries_created,
                  total_engaged_users
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                this.sanitizeSqlParams([
                  metricsId,
                  repoId,
                  safeModel.name,
                  safeModel.is_custom_model,
                  safeModel.custom_model_training_date,
                  safeModel.total_pr_summaries_created,
                  safeModel.total_engaged_users,
                ])
              );
            }
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        console.error('Error saving metrics:', error);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Error in saveMetrics:', err);
    return false;
  }
}


  // assembleMetrics method
  private async assembleMetrics(metricsRow: any): Promise<CopilotMetrics> {
    const connection = this.dbConnection;
    if (!connection) {
      console.error('Database connection is not initialized.');
      throw new Error('Database connection is not initialized.');
    }

    const metricsId = metricsRow.id;

    const copilotMetrics = new CopilotMetrics({
      date: metricsRow.date.toISOString().split('T')[0],
      total_active_users: metricsRow.total_active_users,
      total_engaged_users: metricsRow.total_engaged_users,
      copilot_ide_code_completions: null,
      copilot_ide_chat: null,
      copilot_dotcom_chat: null,
      copilot_dotcom_pull_requests: null,
    });

    // Assemble copilot_ide_code_completions
    const [completionRows] = await connection.execute<RowDataPacket[]>(
      `
      SELECT id, metrics_id, total_engaged_users
      FROM copilot_ide_code_completions
      WHERE metrics_id = ?
      `,
      [metricsId]
    );

    if (completionRows.length > 0) {
      const completionRow = completionRows[0];
      const completionId = completionRow.id;

      const copilotIdeCodeCompletions = new CopilotIdeCodeCompletions({
        total_engaged_users: completionRow.total_engaged_users,
        languages: [],
        editors: [],
      });

      // Get languages
      const [languageRows] = await connection.execute<RowDataPacket[]>(
        `
        SELECT id, metrics_id, completion_id, name, total_engaged_users
        FROM copilot_ide_code_completions_languages
        WHERE completion_id = ?
        `,
        [completionId]
      );

      for (const langRow of languageRows) {
        const language = new CopilotIdeCodeCompletionsLanguage({
          name: langRow.name,
          total_engaged_users: langRow.total_engaged_users,
        });
        copilotIdeCodeCompletions.languages.push(language);
      }

      // Get editors
      const [editorRows] = await connection.execute<RowDataPacket[]>(
        `
        SELECT id, metrics_id, completion_id, name, total_engaged_users
        FROM copilot_ide_code_completions_editors
        WHERE completion_id = ?
        `,
        [completionId]
      );

      for (const editorRow of editorRows) {
        const editorId = editorRow.id;

        const editor = new CopilotIdeCodeCompletionsEditor({
          name: editorRow.name,
          total_engaged_users: editorRow.total_engaged_users,
          models: [],
        });

        // Get models
        const [modelRows] = await connection.execute<RowDataPacket[]>(
          `
          SELECT id, metrics_id, editor_id, name, is_custom_model, custom_model_training_date, total_engaged_users
          FROM copilot_ide_code_completions_editor_models
          WHERE editor_id = ?
          `,
          [editorId]
        );

        for (const modelRow of modelRows) {
          const modelId = modelRow.id;

          const model = new CopilotIdeCodeCompletionsEditorModel({
            name: modelRow.name,
            is_custom_model: modelRow.is_custom_model,
            custom_model_training_date: modelRow.custom_model_training_date,
            total_engaged_users: modelRow.total_engaged_users,
            languages: [],
          });

          // Get model languages
          const [modelLangRows] = await connection.execute<RowDataPacket[]>(
            `
            SELECT id, metrics_id, model_id, name, total_engaged_users, total_code_suggestions, total_code_acceptances, total_code_lines_suggested, total_code_lines_accepted
            FROM copilot_ide_code_completions_editor_model_languages
            WHERE model_id = ?
            `,
            [modelId]
          );

          for (const modelLangRow of modelLangRows) {
            const modelLanguage = new CopilotIdeCodeCompletionsEditorModelLanguage({
              name: modelLangRow.name,
              total_engaged_users: modelLangRow.total_engaged_users,
              total_code_suggestions: modelLangRow.total_code_suggestions,
              total_code_acceptances: modelLangRow.total_code_acceptances,
              total_code_lines_suggested: modelLangRow.total_code_lines_suggested,
              total_code_lines_accepted: modelLangRow.total_code_lines_accepted,
            });
            model.languages.push(modelLanguage);
          }

          editor.models.push(model);
        }

        copilotIdeCodeCompletions.editors.push(editor);
      }

      copilotMetrics.copilot_ide_code_completions = copilotIdeCodeCompletions;
    }

    // Assemble copilot_ide_chat (similar logic)
    // Assemble copilot_dotcom_chat (similar logic)
    // Assemble copilot_dotcom_pull_requests (similar logic)

    return copilotMetrics;
  }

  // please fill in the GetMetrics method with the correct implementation by calling 
  // the assembleMetrics method to get the metrics data from the database
  public async getMetrics(team_slug?: string): Promise<CopilotMetrics[]> {
    await this.ensureInitialized();
    if (!team_slug) {
      team_slug = this.team;
    }
    const connection = this.dbConnection;
    if (!connection) {
      console.error('Database connection is not initialized.');
      throw new Error('Database connection is not initialized.');
    }

    const metricsList: CopilotMetrics[] = [];

    try {
      // Query copilot_metrics table
      const [metricsRows] = await connection.execute<RowDataPacket[]>(
        `
        SELECT id, date, total_active_users, total_engaged_users
        FROM copilot_metrics
        WHERE scope_type = ?
          AND scope_name = ?
          AND team = ?
        `,
        this.sanitizeSqlParams([this.type, this.scope_name, team_slug])
      );

      for (const metricsRow of metricsRows) {
        const copilotMetrics = await this.assembleMetrics(metricsRow);
        metricsList.push(copilotMetrics);
      }

      return metricsList;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }
  }

public async queryMetrics(
  since?: string,
  until?: string,
  page: number = 1,
  per_page: number = 28,
  team_slug?: string
): Promise<CopilotMetrics[]> {
  await this.ensureInitialized();
  if (!team_slug) {
    team_slug = this.team;
  }
  const connection = this.dbConnection;
  if (!connection) {
    console.error('Database connection is not initialized.');
    return [];
  }

  try {
    const params: any[] = [this.type, this.scope_name, team_slug];
    let query = `
      SELECT id, date, total_active_users, total_engaged_users
      FROM copilot_metrics
      WHERE scope_type = ? AND scope_name = ? AND team = ?
    `;

    if (since) {
      query += ' AND date >= ?';
      params.push(since);
    }

    if (until) {
      query += ' AND date <= ?';
      params.push(until);
    }

    query += ' ORDER BY date DESC';
   // query += ' ORDER BY date DESC LIMIT ? OFFSET ?';
   // params.push(per_page, (page - 1) * per_page);

    const [rows] = await connection.execute<RowDataPacket[]>(query, this.sanitizeSqlParams(params));

    const metrics: CopilotMetrics[] = [];
    for (const row of rows) {
      const metricsData = await this.assembleMetrics(row);
      metrics.push(metricsData);
    }

    return metrics;
  } catch (error) {
    console.error('Error querying metrics:', error);
    return [];
  }
}

private async removeMetrics(metricsId: number): Promise<boolean> {
  const connection = this.dbConnection;
  if (!connection) {
    console.error('Database connection is not initialized.');
    return false;
  }

  try {
    const tables = [
      'copilot_ide_code_completions_editor_model_languages',
      'copilot_ide_code_completions_editor_models',
      'copilot_ide_code_completions_editors',
      'copilot_ide_code_completions_languages',
      'copilot_ide_code_completions',
      'copilot_ide_chat_editor_models',
      'copilot_ide_chat_editors',
      'copilot_ide_chat',
      'copilot_dotcom_chat_models',
      'copilot_dotcom_chat',
      'copilot_dotcom_pull_requests_repository_models',
      'copilot_dotcom_pull_requests_repositories',
      'copilot_dotcom_pull_requests',
      // Add other related tables if needed
    ];

    for (const table of tables) {
      await connection.execute(`DELETE FROM ${table} WHERE metrics_id = ?`, this.sanitizeSqlParams([metricsId]));
    }

    await connection.execute(`DELETE FROM copilot_metrics WHERE id = ?`, this.sanitizeSqlParams([metricsId]));
    return true;
  } catch (error) {
    console.error('Error removing metrics:', error);
    return false;
  }
}

/**
 * Ensures that SQL parameters do not contain undefined values
 * by converting undefined to null
 * Generated by Zhuang
 */
private sanitizeSqlParams(params: any[]): any[] {
  return params.map(param => param === undefined ? null : param);
}

/**
 * Ensures model data has all required fields with default values
 * Generated by Zhuang
 */
private ensureModelDefaults(model: any): any {
  // Deep clone to avoid modifying original object
  const safeModel = JSON.parse(JSON.stringify(model));
  
  // Ensure required fields exist with default values
  if (safeModel.total_engaged_users === undefined) {
    safeModel.total_engaged_users = 0;
  }
  
  // For copilot_ide_chat_editor_models
  if (safeModel.total_chats === undefined) {
    safeModel.total_chats = 0;
  }
  if (safeModel.total_chat_insertion_events === undefined) {
    safeModel.total_chat_insertion_events = 0;
  }
  if (safeModel.total_chat_copy_events === undefined) {
    safeModel.total_chat_copy_events = 0;
  }
  
  // For copilot_dotcom_chat_models
  if (safeModel.total_chats === undefined) {
    safeModel.total_chats = 0;
  }
  
  // For copilot_dotcom_pull_requests_repository_models
  if (safeModel.total_pr_summaries_created === undefined) {
    safeModel.total_pr_summaries_created = 0;
  }
  
  return safeModel;
}

}
