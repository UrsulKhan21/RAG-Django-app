from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from chat.models import ChatMessage, ChatSession
from sources.models import ApiSource
from sources.rag_service import get_qdrant_client


class Command(BaseCommand):
    help = "Delete RAG vectors and application data so the project can start fresh."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Confirm the destructive reset.",
        )
        parser.add_argument(
            "--include-users",
            action="store_true",
            help="Also delete Django users and linked auth data.",
        )
        parser.add_argument(
            "--skip-qdrant",
            action="store_true",
            help="Only clear database rows, leaving Qdrant untouched.",
        )

    def handle(self, *args, **options):
        if not options["yes"]:
            raise CommandError("This is destructive. Re-run with --yes to confirm.")

        sources = list(ApiSource.objects.all())

        if not options["skip_qdrant"]:
            client = get_qdrant_client()
            collections = client.get_collections().collections
            collection_names = {collection.name for collection in collections}

            deleted_collections = 0
            for source in sources:
                if source.collection_name in collection_names:
                    client.delete_collection(source.collection_name)
                    deleted_collections += 1

            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_collections} Qdrant collections."))

        deleted_messages, _ = ChatMessage.objects.all().delete()
        deleted_sessions, _ = ChatSession.objects.all().delete()
        deleted_sources, _ = ApiSource.objects.all().delete()

        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_messages} chat messages."))
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_sessions} chat sessions."))
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_sources} sources."))

        if options["include_users"]:
            deleted_users, _ = User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_users} users."))

        self.stdout.write(self.style.SUCCESS("Reset complete."))
