import { getMongoClient } from '../mongoClient';
import type { Collection, Filter, UpdateFilter } from 'mongodb';
import type {
  ApplicationStage,
  StageType,
  StageStatus,
} from '../../shared/types/applicationStage';

/**
 * Repository for managing application stages in MongoDB
 * Handles CRUD operations and specialized queries for stage management
 */
export class ApplicationStageRepository {
  private async getCollection(): Promise<Collection<ApplicationStage>> {
    const client = await getMongoClient();
    return client.db().collection<ApplicationStage>('applicationStages');
  }

  /**
   * Find a stage by its ID
   */
  async findById(stageId: string): Promise<ApplicationStage | null> {
    const collection = await this.getCollection();
    return collection.findOne({ id: stageId });
  }

  /**
   * Find all stages for a specific application
   * Returns stages sorted by order (ascending)
   */
  async findByApplicationId(
    applicationId: string
  ): Promise<ApplicationStage[]> {
    const collection = await this.getCollection();
    return collection.find({ applicationId }).sort({ order: 1 }).toArray();
  }

  /**
   * Find stages by application ID and stage type
   * Useful for enforcing business rules (e.g., max 3 assignments)
   */
  async findByType(
    applicationId: string,
    type: StageType
  ): Promise<ApplicationStage[]> {
    const collection = await this.getCollection();
    return collection.find({ applicationId, type }).toArray();
  }

  /**
   * Find the active stage for an application
   * Active stages have status: in_progress, awaiting_candidate, or awaiting_recruiter
   */
  async findActiveStage(
    applicationId: string
  ): Promise<ApplicationStage | null> {
    const collection = await this.getCollection();
    return collection.findOne({
      applicationId,
      status: {
        $in: ['in_progress', 'awaiting_candidate', 'awaiting_recruiter'],
      },
    });
  }

  /**
   * Find all pending stages for an application
   */
  async findPendingStages(applicationId: string): Promise<ApplicationStage[]> {
    const collection = await this.getCollection();
    return collection.find({ applicationId, status: 'pending' }).toArray();
  }

  /**
   * Count stages by type for an application
   * Used to enforce max stage limits (e.g., max 3 assignments)
   */
  async countByType(applicationId: string, type: StageType): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments({ applicationId, type });
  }

  /**
   * Create a new stage
   */
  async create(stage: ApplicationStage): Promise<ApplicationStage> {
    const collection = await this.getCollection();
    await collection.insertOne(stage);
    return stage;
  }

  /**
   * Update a stage with partial data
   * Uses atomic operations for safe concurrent updates
   */
  async update(
    stageId: string,
    updates: Partial<Omit<ApplicationStage, 'id' | 'applicationId'>>
  ): Promise<void> {
    const collection = await this.getCollection();
    const updateDoc: UpdateFilter<ApplicationStage> = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };

    const result = await collection.updateOne({ id: stageId }, updateDoc);

    if (result.matchedCount === 0) {
      throw new Error(`Stage not found: ${stageId}`);
    }
  }

  /**
   * Update stage status atomically
   * Includes timestamp update based on status
   */
  async updateStatus(
    stageId: string,
    newStatus: StageStatus,
    updatedBy: string
  ): Promise<void> {
    const collection = await this.getCollection();
    const now = new Date();

    const setFields: {
      status: StageStatus;
      updatedAt: Date;
      updatedBy: string;
      completedAt?: Date;
    } = {
      status: newStatus,
      updatedAt: now,
      updatedBy,
    };

    // Set completedAt when marking as completed
    if (newStatus === 'completed') {
      setFields.completedAt = now;
    }

    const updateDoc: UpdateFilter<ApplicationStage> = {
      $set: setFields,
    };

    const result = await collection.updateOne({ id: stageId }, updateDoc);

    if (result.matchedCount === 0) {
      throw new Error(`Stage not found: ${stageId}`);
    }
  }

  /**
   * Add or update stage-specific data
   * Merges new data with existing data
   */
  async addStageData(
    stageId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const collection = await this.getCollection();

    const stage = await this.findById(stageId);
    if (!stage) {
      throw new Error(`Stage not found: ${stageId}`);
    }

    const updatedData = {
      ...stage.data,
      ...data,
    };

    await collection.updateOne(
      { id: stageId },
      {
        $set: {
          data: updatedData,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Delete a stage
   * Should be used with caution - prefer marking as skipped
   */
  async delete(stageId: string): Promise<void> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ id: stageId });

    if (result.deletedCount === 0) {
      throw new Error(`Stage not found: ${stageId}`);
    }
  }

  /**
   * Find visible stages for a specific role
   * Candidates see only visibleToCandidate: true stages
   * Recruiters see all stages
   */
  async findVisibleStages(
    applicationId: string,
    role: 'candidate' | 'recruiter'
  ): Promise<ApplicationStage[]> {
    const collection = await this.getCollection();

    const filter: Filter<ApplicationStage> = { applicationId };

    if (role === 'candidate') {
      filter.visibleToCandidate = true;
    }

    return collection.find(filter).sort({ order: 1 }).toArray();
  }

  /**
   * Get the maximum order value for an application's stages
   * Used to determine order for new stages
   */
  async getMaxOrder(applicationId: string): Promise<number> {
    const collection = await this.getCollection();
    const stages = await collection
      .find({ applicationId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();

    return stages.length > 0 && stages[0] ? stages[0].order : 0;
  }

  /**
   * Find all stages with a specific status
   */
  async findByStatus(
    applicationId: string,
    status: StageStatus
  ): Promise<ApplicationStage[]> {
    const collection = await this.getCollection();
    return collection.find({ applicationId, status }).toArray();
  }

  /**
   * Bulk update stages (for migration or cleanup)
   */
  async bulkUpdate(
    applicationId: string,
    updates: Partial<Omit<ApplicationStage, 'id' | 'applicationId'>>
  ): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.updateMany(
      { applicationId },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }
}

// Export singleton instance
export const applicationStageRepo = new ApplicationStageRepository();
