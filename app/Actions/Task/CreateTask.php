<?php

namespace App\Actions\Task;

use App\Events\TaskCreated;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;
use Throwable;

class CreateTask
{
    public function create(Project $project, array $data): Task
    {
        return DB::transaction(function () use ($project, $data) {
            $task = $project->tasks()->create([
                'group_id' => $data['group_id'],
                'created_by_user_id' => auth()->id(),
                'assigned_to_user_id' => $data['assigned_to_user_id'],
                'name' => $data['name'],
                'number' => $project->tasks()->count(),
                'description' => $data['description'],
                'due_on' => $data['due_on'],
                'estimation' => $data['estimation'],
                'hidden_from_clients' => $data['hidden_from_clients'],
                'billable' => $data['billable'],
                'completed_at' => null,
            ]);

            $task->subscribedUsers()->attach($data['subscribed_users'] ?? []);

            $task->labels()->attach($data['labels'] ?? []);

            $this->uploadAttachments($task, $data['attachments'] ?? []);

            TaskCreated::dispatch($task);

            return $task;
        });
    }

    public function uploadAttachments(Task $task, array $items): Collection
    {
        $rows = collect($items)
            ->map(function (UploadedFile $item) use ($task) {
                $filename = strtolower(Str::ulid()).'.'.$item->getClientOriginalExtension();
                $filepath = "tasks/{$task->id}/{$filename}";

                $item->storeAs('public', $filepath);

                $thumbFilepath = $this->generateThumb($item, $task, $filename);

                return [
                    'user_id' => auth()->id(),
                    'name' => $item->getClientOriginalName(),
                    'path' => "/storage/$filepath",
                    'thumb' => $thumbFilepath ? "/storage/$thumbFilepath" : null,
                    'type' => $item->getClientMimeType(),
                    'size' => $item->getSize(),
                ];
            });

        return $task->attachments()->createMany($rows);
    }

    protected function generateThumb(UploadedFile $file, Task $task, string $filename)
    {
        if (in_array($file->getClientOriginalExtension(), ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'])) {
            try {
                $thumbFilepath = "tasks/{$task->id}/thumbs/{$filename}";

                $image = Image::make($file->get())
                    ->fit(100, 100)
                    ->encode(null, 75);

                Storage::put("public/$thumbFilepath", $image);

                return $thumbFilepath;
            } catch (Throwable $e) {
                return null;
            }
        }

        return null;
    }
}
