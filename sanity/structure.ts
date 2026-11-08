import type { StructureResolver } from 'sanity/structure'

/**
 * Admin panel layout. Moderators get a dedicated queue of comments
 * awaiting review; editors see content grouped by type.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Довідник електроніки')
    .items([
      S.listItem()
        .title('⏳ Коментарі на модерації')
        .child(
          S.documentList()
            .title('На модерації')
            .filter('_type == "comment" && status == "pending"')
            .defaultOrdering([{ field: 'createdAt', direction: 'desc' }]),
        ),
      S.listItem()
        .title('🚩 Позначені AI')
        .child(
          S.documentList()
            .title('AI позначив як небажані')
            .filter('_type == "comment" && aiModeration.flagged == true'),
        ),
      S.divider(),
      S.documentTypeListItem('component').title('Компоненти'),
      S.documentTypeListItem('category').title('Категорії'),
      S.documentTypeListItem('project').title('DIY-проєкти'),
      S.divider(),
      S.documentTypeListItem('topic').title('Теми форуму'),
      S.documentTypeListItem('comment').title('Усі коментарі'),
      S.documentTypeListItem('author').title('Автори'),
    ])
